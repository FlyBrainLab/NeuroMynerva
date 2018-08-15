#!/usr/bin/env python

# Copyright (c) 2015, Lev Givon
# All rights reserved.
# Distributed under the terms of the BSD license:
# http://www.opensource.org/licenses/bsd-license

import pickle
import copy
import logging
import sys

import networkx as nx
from pyorient.ogm import Graph, Config

from neuroarch.models import *
from neuroarch.utils import byteify, chunks, get_cluster_ids

from pyorient.serializations import OrientSerialization

class NetworkXLoader(object):
    col_map = {368: 'home', 336: 'A', 335: 'B', 367: 'C',
               400: 'D', 369: 'E', 337: 'F', 304: 'G',
               303: 'H', 334: 'I', 366: 'J', 398: 'K',
               399: 'L', 432: 'M', 401: 'N', 402: 'O',
               370: 'P', 338: 'Q', 305: 'R', 272: '3A',
               271: '3B', 302: '3C', 301: '3D', 333: '3E',
               365: '3F', 397: '3G', 430: '3H', 431: '3I',
               464: '3J', 433: '3K', 434: '3L', 403: '3M',
               371: '3N', 339: '3O', 307: '3P', 306: '3Q',
               273: '3R'}

    neurons_to_exclude = ['R1','R2','R3','R4','R5','R6',
                          'T4a','T4b','T4c','T4d', 'Am',
                          'T5a','T5b','T5c','T5d',
                          'Mt3h','Mt3v','Dm3','Tm1']
    def __init__(self, g_orient):
        self.logger = logging.getLogger('vl')
        self.g_orient = g_orient

        # Make sure OrientDB classes exist:
        #self.g_orient.create_all(Node.registry)
        #self.g_orient.create_all(Relationship.registry)

        # Get cluster IDs:
        self.cluster_ids = get_cluster_ids(self.g_orient.client)
        print(self.cluster_ids)

        print(NetworkXLoader.col_map)

    def load_lpu(self, file_name, lpu_name):

        # Load GEXF; force the loaded graph to be a directed multigraph to
        # consistently handle both single and multiple edges between a pair of
        # nodes:
        self.g_nx = nx.MultiDiGraph(nx.read_gexf(file_name))

        # Create an LPU node that owns the cartridge, cr, and interface nodes:
        lpu = self.g_orient.LPUs.create(name=lpu_name)
        self.logger.info('created node: {0}({1})'.format(lpu.element_type, lpu.name))

        np = self.g_orient.Neuropils.query(name=lpu_name).first()
        if not np:
            np = self.g_orient.Neuropils.create(name=lpu_name)

        # Create interface node and connect it to the LPU node:
        interface = self.g_orient.Interfaces.create(name=lpu_name)
        self.logger.info('created node: {0}({1})'.format(
            interface.element_type, interface.name))
        self.g_orient.Owns.create(lpu, interface)
        self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
            lpu.element_type, lpu.name, interface.element_type, interface.name))

        # Create neuron and circuit nodes and connect the LPU node to the
        # latter:
        nid_to_node = {}
        circuit_to_node = {}
        circuit_to_node_bio = {}
        nid_to_circuit_bio = {}
        nid_to_circuit = {}
        count = self.g_nx.number_of_nodes()
        max_nid_int = max(map(lambda x: int(x[3:]), self.g_nx.nodes()))
        ds_lit = self.g_orient.DataSources.query(name='Literature').first()
        if not ds_lit:
            ds_lit = self.g_orient.DataSources.create(name='Literature')
        ds_dum = self.g_orient.DataSources.query(name='Dummy').first()
        if not ds_dum:
            ds_dum = self.g_orient.DataSources.create(name='Dummy')

        for i, nid in enumerate(self.g_nx.node):
            self.logger.info('{0}/{1}'.format(i, count))
            data = byteify(self.g_nx.node[nid])
            if 'circuit' in data.keys():
                circuit = data['circuit']
            else:
                circuit = file_name
            if circuit not in circuit_to_node:
                cart = self.g_orient.CircuitModels.create(name=circuit)
                #if int(''.join(i for i in circuit if i.isdigit())) in \
                #   NetworkXLoader.col_map.keys():
                #    bio_cart_name = NetworkXLoader.col_map\
                #        [int(''.join(i for i in circuit if i.isdigit()))]
                #else:
                bio_cart_name = circuit
                cart_bio = self.g_orient.Circuits.query(name=bio_cart_name).first()
                if not cart_bio:
                    cart_bio = self.g_orient.Circuits.create(
                        name=bio_cart_name)
                    self.g_orient.Owns.create(np, cart_bio)

                self.logger.info('created node: {0}({1})'.format(
                    cart.element_type, circuit))
                self.g_orient.Owns.create(lpu, cart)
                self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                    lpu.element_type, lpu.name, cart.element_type, cart.name))
                circuit_to_node[circuit] = cart
                circuit_to_node_bio[circuit] = cart_bio

            # Leave out unnecessary data from neuron node contents:
            if 'circuit' in data.keys():
                del data['circuit']
            if 'label' in data.keys():
                del data['label']

            # Neurons with a model equal to 'Port' or 'port_in_spike'
            # are input ports, not neurons:
            if data['class'] in ['Port', 'Port']:
                if data['class'] == 'Port':
                    data['port_type'] = 'gpot'
                elif data['class'] == 'Port':
                    data['port_type'] = 'spike'
                else:
                    raise ValueError('unexpected port type')
                data['port_io'] = 'in'

                dl = []
                for k in data.keys():
                    if k not in ['port_type', 'port_io', 'selector']: dl.append(k)
                for k in dl: del data[k]

                # Bypass OGM to create port using JSON contents:
                n = self.g_orient.client.record_create(self.cluster_ids['Port'][0],
                                                       {'@port': data})
                port = self.g_orient.get_element(n._rid)
                self.logger.info('created node: {0}({1})'.format(
                    port.element_type, data['selector']))
                nid_to_node[nid] = port
                nid_to_circuit[nid] = circuit

                # Connect port to interface node:
                self.g_orient.Owns.create(interface, port)
                self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                    interface.element_type, interface.name,
                    port.element_type, data['selector']))

            # Neurons with a model not equal to 'Port' or 'port_in_spike'
            # and a 'public' attribute equal to True emit output and should be
            # connected to output ports:
            elif 'public' in data.keys():
                if data['public']:

                    # Copy the node data to create output port node and set
                    # port-related attributes:
                    out_port_data = copy.deepcopy(data)
                    if out_port_data['spiking']:
                        out_port_data['port_type'] = 'spike'
                    else:
                        out_port_data['port_type'] = 'gpot'
                    out_port_data['port_io'] = 'out'

                    dl = []
                    for k in out_port_data.keys():
                        if k not in ['port_type', 'port_io', 'selector']: dl.append(k)
                    for k in dl: del out_port_data[k]

                    # Create a new node ID for the new output port node:
                    max_nid_int += 1
                    out_port_nid = str(max_nid_int)
                    n = self.g_orient.client.record_create(self.cluster_ids['Port'][0],
                                                           {'@port': out_port_data})
                    port = self.g_orient.get_element(n._rid)
                    self.logger.info('created node: {0}({1})'.format(
                        port.element_type, out_port_data['selector']))
                    nid_to_node[out_port_nid] = port

                    # Connect port to interface node:
                    self.g_orient.Owns.create(interface, port)
                    self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                        interface.element_type, interface.name,
                        port.element_type, out_port_data['selector']))

                    # Remove selector attribute from the neuron data:
                    del data['selector']

            # Create the neuron and assosciated node while reorganizing data:
            new_data = {}
            for k,v in data.iteritems():
                if isinstance(k,basestring):
                    try:
                        k1,k2 = k.split('.')
                        try:
                            new_data[k1][k2] = v
                        except:
                            new_data[k1] = {}
                            new_data[k1]['name'] = data['name']
                            new_data[k1][k2] = v
                        if k1=='genetic' and k2=='expresses':
                            v = v.split(',')
                            new_data[k1][k2] = v
                    except:
                        if not k=='class':
                            try:
                                new_data[data['class']][k] = v
                            except:
                                new_data[data['class']] = {}
                                new_data[data['class']][k] = v
                                #new_data['class']['name'] = data['name']
                                new_data[data['class']]['model_name'] = 'model1.0'

                else:
                    if not k=='class':
                        try:
                            new_data[data['class']][k] = v
                        except:
                            new_data[data['class']] = {}
                            new_data[data['class']][k] = v

            # Create NeuronModel and connect it to the undelying MembraneModel/AxonHillock Model
            n = self.g_orient.client.record_create(self.cluster_ids[data['class']][0],
                                                   {'@neuronmodel': new_data[data['class']]})
            n_data_nodes = []
            n_data_objs = []
            neuron = self.g_orient.get_element(n._rid)

            # Connect to biological node if it exists. If not create new biological node
            bio_n = None
            if data['name'] not in NetworkXLoader.neurons_to_exclude:
                cart_bio = circuit_to_node_bio[circuit]
                try:
                    bio_n = cart_bio.owns().has(
                        name=data['name'],cls='Neuron').get_as('obj')[0][0]
                except:
                    bio_n = self.g_orient.Neurons.create(name=data['name'])
                    self.g_orient.Owns.create(cart_bio, bio_n)
                self.g_orient.Models.create(neuron, bio_n)

            for k,v in new_data.iteritems():
                data_node = False
                if k=='genetic':
                    if bio_n:
                        for v1,v2 in v.iteritems():
                            if v1 == 'neurotransmitter':
                                if isinstance(v2, basestring):
                                    v2 = [v2]
                                gt = self.g_orient.client.command(
                        'Create Vertex NeurotransmitterData content %s' \
                        % {'Transmitters':v2, 'name':data['name']})[0]
                                gt = self.g_orient.get_element(gt._rid)
                                self.g_orient.HasData.create(bio_n, gt)
                                self.g_orient.Owns.create(ds_lit, gt)
                            elif v1 == 'expresses':
                                gn = self.g_orient.client.command(
                                    'Create vertex GeneticData content %s' \
                                    % {'ExpressedIn':v2,'name':data['name']})[0]
                                gn = self.g_orient.get_element(gn._rid)
                                self.g_orient.HasData.create(bio_n, gn)
                                self.g_orient.Owns.create(ds_dum, gn)
                            else:
                                # Other information not supported yet
                                pass

                elif not k==data['class']:
                    k = list(k)
                    k[0] = k[0].upper()
                    k = ''.join(k)
                    n_data_nodes.append(self.g_orient.client.record_create(self.cluster_ids[k][0],
                                                                           {'@%s' % k: v}))
                    data_node =True
                if data_node:
                    n_data_objs.append(self.g_orient.get_element(n_data_nodes[-1]._rid))
                    self.g_orient.HasData.create(neuron, n_data_objs[-1])
            self.logger.info('created node: {0}({1})'.format(
                neuron.element_type, data['name']))
            nid_to_node[nid] = neuron
            nid_to_circuit[nid] = circuit


                # If the neuron emits output, connect the neuron node to the new
                # output port node:
            if 'public' in data.keys():
                if data['public']:
                    self.g_orient.SendsTo.create(nid_to_node[nid], nid_to_node[out_port_nid])
                    self.logger.info('created edge: {0}({1}) -[data]-> {2}({3})'.format(
                        neuron.element_type, neuron.name,
                        port.element_type, out_port_data['selector']))

        # Connect neurons to data_nodes
        self.logger.info('Connected neuron nodes to data nodes')

        count = len(nid_to_circuit)
        i = 0
        N = 10
        for chunk in chunks(nid_to_circuit.keys(), N):
            cmd_list = ["create edge owns from %s to %s;" % \
                        (circuit_to_node[nid_to_circuit[nid]]._id,
                         nid_to_node[nid]._id) for nid in chunk]
            cmd = 'begin;'+''.join(cmd_list)+'commit;'
            r = self.g_orient.client.batch(cmd)
            for nid in chunk:
                circuit_node = circuit_to_node[nid_to_circuit[nid]]
                node = nid_to_node[nid]
                self.logger.info('{0}/{1}'.format(i, count))
                if node.element_type == 'neuron':
                    identifier = node.name
                elif node.element_type == 'port':
                    identifier = node.selector
                else:
                    identifier = '?'
                self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                    circuit_node.element_type, circuit_node.name,
                    node.element_type, identifier))
                i += 1

        # Create synapse nodes from NetworkX edges and connect them to neuron and
        # circuit nodes:
        # Connect Biological synapses, Update neurotransmitter information
        '''

        TODO (Ignoring for now)

        '''
        count = self.g_nx.number_of_edges()
        for i, (from_nid, to_nid) in enumerate(self.g_nx.edges()):
            self.logger.info('{0}/{1}'.format(i, count))
            for j in self.g_nx.edge[from_nid][to_nid]:
                data = byteify(self.g_nx.edge[from_nid][to_nid][j])
                if 'circuit' in data.keys():
                    circuit = data['circuit']
                else:
                    circuit = file_name

                if circuit not in circuit_to_node:
                    cart = self.g_orient.CircuitModels.create(name=circuit)
                    #if int(''.join(i for i in circuit if i.isdigit())) in \
                    #   NetworkXLoader.col_map.keys():
                    #    bio_cart_name = NetworkXLoader.col_map\
                    #        [int(''.join(i for i in circuit if i.isdigit()))]
                    #else:
                    bio_cart_name = circuit
                    cart_bio = self.g_orient.Circuits.query(name=bio_cart_name).first()
                    if not cart_bio:
                        cart_bio = self.g_orient.Circuits.create(
                            name=bio_cart_name)
                        self.g_orient.Owns.create(np, cart_bio)

                    self.logger.info('created node: {0}({1})'.format(
                        cart.element_type, circuit))
                    self.g_orient.Owns.create(lpu, cart)
                    self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                        lpu.element_type, lpu.name, cart.element_type, cart.name))
                    circuit_to_node[circuit] = cart
                    circuit_to_node_bio[circuit] = cart_bio

                # Remove unneeded fields from synapse node data:
                if 'id' in data.keys():
                    del data['id']
                if 'circuit' in data.keys():
                    del data['circuit']

                cmd = ("begin;"
                       "create edge sendsto from %s to %s;"
                       "commit;") % \
                    (nid_to_node[from_nid]._id, nid_to_node[to_nid]._id)
                r = self.g_orient.client.batch(cmd)
                self.logger.info('created edge: {0}({1}) -[data]-> {2}({3})'.format(
                    nid_to_node[from_nid].element_type,
                    nid_to_node[from_nid].name \
                       if nid_to_node[from_nid].element_type != 'Port' \
                       else nid_to_node[from_nid].selector,
                    nid_to_node[to_nid].element_type,
                    nid_to_node[to_nid].name \
                        if nid_to_node[to_nid].element_type != 'Port' \
                        else nid_to_node[to_nid].selector))

    def load_pat(self, file_name, from_lpu, to_lpu):

        # Create pattern node:
        pat = self.g_orient.Patterns.create(name='{0}-{1}'.format(from_lpu, to_lpu))
        self.logger.info('created node: {0}({1})'.format(pat.element_type, pat.name))

        # Create interface nodes:
        from_interface = self.g_orient.Interfaces.create(name=from_lpu)
        self.logger.info('created node: {0}({1})'.format(
            from_interface.element_type, from_interface.name))
        to_interface = self.g_orient.Interfaces.create(name=to_lpu)
        self.logger.info('created node: {0}({1})'.format(
            to_interface.element_type, to_interface.name))

        # Connect interface nodes to pattern node:
        self.g_orient.Owns.create(pat, from_interface)
        self.g_orient.Owns.create(pat, to_interface)
        self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
            pat.element_type, pat.name,
            from_interface.element_type, from_interface.name))
        self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
            pat.element_type, pat.name,
            to_interface.element_type, to_interface.name))

        g_pat = pickle.load(open(file_name, 'r')).to_graph()

        # Create port nodes:
        sel_to_node = {}
        count = g_pat.number_of_nodes()
        from_sel_list = []
        to_sel_list = []

        for i, sel in enumerate(g_pat.nodes()):
            self.logger.info('{0}/{1}'.format(i, count))
            data = {}
            data['selector'] = sel
            data['port_type'] = g_pat.node[sel]['type']
            data['port_io'] = g_pat.node[sel]['io']
            n = self.g_orient.client.record_create(self.cluster_ids['Port'][0],
                                                   {'@port': data})
            port = self.g_orient.get_element(n._rid)
            self.logger.info('created node: {0}({1})'.format(
                port.element_type, data['selector']))
            sel_to_node[sel] = port
            if g_pat.node[sel]['interface']:
                to_sel_list.append(sel)
            else:
                from_sel_list.append(sel)

        # Connect source and destination ports:
        for i, (from_sel, to_sel) in enumerate(g_pat.edges()):
            self.g_orient.SendsTo.create(sel_to_node[from_sel], sel_to_node[to_sel])
            self.logger.info('created edge: {0}({1}) -[data]-> {2}({3})'.format(
                sel_to_node[from_sel].element_type, from_sel,
                sel_to_node[to_sel].element_type, to_sel))

        # Connect interface nodes to port nodes:
        N = 20
        i = 0
        count = len(from_sel_list)
        for chunk in chunks(from_sel_list, N):
            cmd_list = ["create edge owns from %s to %s;" % \
                        (from_interface._id, sel_to_node[sel]._id) for sel in chunk]
            cmd = 'begin;'+''.join(cmd_list)+'commit;'
            r = self.g_orient.client.batch(cmd)
            for sel in chunk:
                self.logger.info('{0}/{1}'.format(i, count))
                self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                    from_interface.element_type, from_interface.name,
                    sel_to_node[sel].element_type, sel))
                i += 1
        i = 0
        count = len(to_sel_list)
        for chunk in chunks(to_sel_list, N):
            cmd_list = ["create edge owns from %s to %s;" % \
                        (to_interface._id, sel_to_node[sel]._id) for sel in chunk]
            cmd = 'begin;'+''.join(cmd_list)+'commit;'
            r = self.g_orient.client.batch(cmd)
            for sel in chunk:
                self.logger.info('{0}/{1}'.format(i, count))
                self.logger.info('created edge: {0}({1}) -[owns]-> {2}({3})'.format(
                    to_interface.element_type, to_interface.name,
                    sel_to_node[sel].element_type, sel))
                i += 1

    def connect(self, lpu0_name, lpu1_name, pat_name):

        # Get LPU ports:
        lpu0_lpu_ports = \
            self.g_orient.client.gremlin(("(new GremlinGroovyPipeline()).start"
                            "(g.getVerticesOfClass('lpu'))."
                            "has('name','%s').out.out.has('@class','port')") % lpu0_name)
        lpu1_lpu_ports = \
            self.g_orient.client.gremlin(("(new GremlinGroovyPipeline()).start"
                            "(g.getVerticesOfClass('lpu'))."
                            "has('name','%s').out.out.has('@class','port')") % lpu1_name)

        # Get pattern ports:
        lpu0_pat_ports = \
            self.g_orient.client.gremlin(("(new GremlinGroovyPipeline()).start"
                                          "(g.getVerticesOfClass('pattern'))."
                                          "has('name','%s').out."
                                          "has('@class','interface')."
                                          "has('name','%s').out."
                                          "has('@class','port')") % (pat_name, lpu0_name))
        lpu1_pat_ports = \
            self.g_orient.client.gremlin(("(new GremlinGroovyPipeline()).start"
                                          "(g.getVerticesOfClass('pattern'))."
                                          "has('name','%s').out."
                                          "has('@class','interface')."
                                          "has('name','%s').out."
                                          "has('@class','port')") % (pat_name, lpu1_name))

        # Map selectors to RIDs:
        lpu0_lpu_ports_data = \
            {r.oRecordData['selector']: {'rid': r._rid,
                                         'port_io': r.oRecordData['port_io'],
                                         'port_type': r.oRecordData['port_type']} \
             for r in lpu0_lpu_ports}
        lpu1_lpu_ports_data = \
            {r.oRecordData['selector']: {'rid': r._rid,
                                         'port_io': r.oRecordData['port_io'],
                                         'port_type': r.oRecordData['port_type']} \
             for r in lpu1_lpu_ports}
        lpu0_pat_ports_data = \
            {r.oRecordData['selector']: {'rid': r._rid,
                                         'port_io': r.oRecordData['port_io'],
                                         'port_type': r.oRecordData['port_type']} \
             for r in lpu0_pat_ports}
        lpu1_pat_ports_data = \
            {r.oRecordData['selector']: {'rid': r._rid,
                                         'port_io': r.oRecordData['port_io'],
                                         'port_type': r.oRecordData['port_type']} \
             for r in lpu1_pat_ports}

        # Find selectors of ports exposed by both the LPU and the pattern interface
        # to which it is to be connected:
        lpu0_ports_sels = \
            set(lpu0_lpu_ports_data.keys()).intersection(lpu0_pat_ports_data.keys())
        lpu1_ports_sels = \
            set(lpu1_lpu_ports_data.keys()).intersection(lpu1_pat_ports_data.keys())

        # Connect LPUs to pattern:
        def connect_lpu_pat(ports_sels, lpu_ports_data, pat_ports_data):
            count = len(ports_sels)
            for i, sel in enumerate(ports_sels):
                lpu_port_data = lpu_ports_data[sel]
                pat_port_data = pat_ports_data[sel]
                pat_port = self.g_orient.get_element(pat_port_data['rid'])
                lpu_port = self.g_orient.get_element(lpu_port_data['rid'])
                if lpu_port_data['port_io'] == 'in' and \
                   pat_port_data['port_io'] == 'out':
                    assert lpu_port_data['port_type'] == pat_port_data['port_type']
                    self.g_orient.SendsTo.create(pat_port, lpu_port)
                    self.logger.info('created edge: {0}({1}) -[data]-> {2}({3})'.format(
                        pat_port.element_type, sel,
                        lpu_port.element_type, sel))
                elif lpu_port_data['port_io'] == 'out' and \
                     pat_port_data['port_io'] == 'in':
                    assert lpu_port_data['port_type'] == pat_port_data['port_type']
                    self.g_orient.SendsTo.create(lpu_port, pat_port)
                    self.logger.info('created edge: {0}({1}) -[data]-> {2}({3})'.format(
                        lpu_port.element_type, sel,
                        pat_port.element_type, sel))
                else:
                    raise RuntimeError('incompatible port IO attributes for %s' % sel)
        connect_lpu_pat(lpu0_ports_sels, lpu0_lpu_ports_data, lpu0_pat_ports_data)
        connect_lpu_pat(lpu1_ports_sels, lpu1_lpu_ports_data, lpu1_pat_ports_data)

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, stream=sys.stdout,
                        format='%(asctime)s %(name)s %(levelname)s %(message)s')
    #g_orient = Graph(Config.from_url('/vision_demo','admin', 'admin', initial_drop=True)) # set to True to erase the database
    g_orient = Graph(Config.from_url('/ampa/bionet/databases/development/na_server','admin', 'admin', initial_drop=False,
                                     serialization_type=OrientSerialization.Binary))  # set to True to erase the database
    g_orient.create_all(Node.registry)
    g_orient.create_all(Relationship.registry)

    #g_orient.include(Node.registry)
    #g_orient.include(Relationship.registry)

    vl = NetworkXLoader(g_orient)

    # Load LPU data:

    vl.logger.info('Loading sample Lamina circuit...')
    vl.load_lpu('lamina.gexf.gz', 'LAM')
