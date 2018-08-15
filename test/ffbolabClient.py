from time import sleep
import txaio
import random
from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp.exception import ApplicationError
from twisted.internet._sslverify import OpenSSLCertificateAuthorities
from twisted.internet.ssl import CertificateOptions
import OpenSSL.crypto
from collections import Counter
from autobahn.wamp.types import RegisterOptions, CallOptions
from autobahn.wamp import auth
from autobahn_sync import publish, call, register, subscribe, run, AutobahnSync
from pathlib import Path
from functools import partial
import numpy as np
import os
import json
import binascii
import neuroballad as nb
from time import gmtime, strftime

## Create the home directory
import os
home = str(Path.home())
if not os.path.exists(os.path.join(home, '.ffbolab')):
    os.makedirs(os.path.join(home, '.ffbolab'), mode=0o777)
    os.makedirs(os.path.join(home, '.ffbolab', 'data'), mode=0o777)
    os.makedirs(os.path.join(home, '.ffbolab', 'config'), mode=0o777)

# Generate the data path to be used for imports
_FFBOLabDataPath = os.path.join(home, '.ffbolab', 'data')

def guidGenerator():
    # Unique query ID generator for handling the backend queries
    def S4():
        return str(((1+random.random())*0x10000))[1]
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4())

def printHeader(name):
    """Header printer for the console messages. Useful for debugging.

    Args:
        name (str): Name of the component.

    Returns:
        str: The string with time format and brackets.
    """
    return '[' + name + ' ' + strftime("%Y-%m-%d %H:%M:%S", gmtime()) + '] '

class ffbolabClient:
    """FFBOLab Client class. This class communicates with JupyterLab frontend and connects to FFBO components.
    
    Attributes:
        FFBOLabcomm (obj): The communication object for sending and receiving data.
        circuit (obj): A Neuroballad circuit that enables local circuit execution and facilitates circuit modification.
        dataPath (str): Data path to be used.
        experimentInputs (list of dicts): Inputs as a list of dicts that can be parsed by the GFX component.
        compiled (bool): Circuits need to be compiled into networkx graphs before being sent for simulation. This is necessary as circuit compilation is a slow process.
        sendDataToGFX (bool): Whether the data received from the backend should be sent to the frontend. Useful for code-only projects.
    """
    def tryComms(self, a):
        """Communication function to communicate with a JupyterLab frontend if one exists.

        Args:
            a (obj): Arbitrarily formatted data to be sent via communication.
        """
        try:
            self.FFBOLabcomm.send(data=a)
        except:
            pass
        
    def __init__(self, ssl = True, debug = True, authentication = True, user = 'guest', secret = 'guestpass', url = u'wss://neuronlp.fruitflybrain.org:7777/ws', realm = u'realm1', ca_cert_file = 'isrgrootx1.pem', intermediate_cert_file = 'letsencryptauthorityx3.pem', FFBOLabcomm = None):
        """Initialization function for the ffbolabClient class.

        Args:
            ssl (bool): Whether the FFBO server uses SSL.
            debug (bool) : Whether debugging should be enabled.
            authentication (bool): Whether authentication is enabled.
            user (str): Username for establishing communication with FFBO components.
            secret (str): Password for establishing communication with FFBO components.
            url (str): URL of the WAMP server with the FFBO Processor component.
            realm (str): Realm to be connected to.
            ca_cert_file (str): Path to the certificate for establishing connection.
            intermediate_cert_file (str): Path to the intermediate certificate for establishing connection.
            FFBOLabcomm (obj) Communications object for the frontend.
        """
        self.FFBOLabcomm = FFBOLabcomm # Current Communications Object
        self.C = None # The Neuroballd Circuit object describing the loaded neural circuit
        self.dataPath = _FFBOLabDataPath
        extra = {'auth': authentication}    
        self.lmsg = 0
        self.experimentInputs = [] # List of current experiment inputs
        self.compiled = False # Whether the current circuit has been compiled into a NetworkX Graph
        self.sendDataToGFX = True # Shall we send the received simulation data to GFX Component?
        self.executionSuccessful = False # Used to wait for data loading
        self.experimentQueue = [] # A queue for experiments
        self.simData = {} # Locally loaded simulation data obtained from server
        self.clientData = [] # Servers list
        self.data = [] # A buffer for data from backend; used in multiple functions so needed
        st_cert=open(ca_cert_file, 'rt').read()
        c=OpenSSL.crypto
        ca_cert=c.load_certificate(c.FILETYPE_PEM, st_cert)
        st_cert=open(intermediate_cert_file, 'rt').read()
        intermediate_cert=c.load_certificate(c.FILETYPE_PEM, st_cert)
        certs = OpenSSLCertificateAuthorities([ca_cert, intermediate_cert])
        ssl_con = CertificateOptions(trustRoot=certs)
        

        
        FFBOLABClient = AutobahnSync()
        
        @FFBOLABClient.on_challenge
        def on_challenge(challenge):
            """The On Challenge function that computes the user signature for verification.
            
            Args:
                challenge (obj): The challenge object received.

            Returns:
                str: The signature sent to the router for verification.
            """
            print(printHeader('FFBOLab Client') + 'Initiating authentication.')
            if challenge.method == u"wampcra":
                print(printHeader('FFBOLab Client') + "WAMP-CRA challenge received: {}".format(challenge))
                print(challenge.extra['salt'])
                if u'salt' in challenge.extra:
                    # Salted secret
                    print(printHeader('FFBOLab Client') + 'Deriving key...')
                    salted_key = auth.derive_key(secret,
                                          challenge.extra['salt'],
                                          challenge.extra['iterations'],
                                          challenge.extra['keylen'])
                    print(salted_key.decode('utf-8'))
                    
                if user=='guest':
                    # A plain, unsalted secret for the guest account
                    salted_key = u"C5/c598Gme4oALjmdhVC2H25OQPK0M2/tu8yrHpyghA="

                # compute signature for challenge, using the key
                signature = auth.compute_wcs(salted_key, challenge.extra['challenge'])

                # return the signature to the router for verification
                return signature

            else:
                raise Exception("Invalid authmethod {}".format(challenge.method))

        FFBOLABClient.run(url=url, authmethods=[u'wampcra'], authid='guest', ssl=ssl_con) # Initialize the communication right now!

        @FFBOLABClient.subscribe('ffbo.server.update.' + str(FFBOLABClient._async_session._session_id))
        def updateServers(data):
            """Updates available servers.
            
            Args:
                data (obj): Obtained servers list.

            """
            self.clientData.append(data)
            print("Updated the Servers")
            
        print("Subscribed to topic 'ffbo.server.update'")
        @FFBOLABClient.register('ffbo.ui.receive_cmd.' + str(FFBOLABClient._async_session._session_id))
        def receiveCommand(data):
            """The Receive Command function that receives commands and sends them to the frontend.
            
            Args:
                data (dict): Data to be sent to the frontend

            Returns:
                bool: Whether the data has been received.
            """
            self.clientData.append('Received Command')
            a = {}
            a['data'] = data
            a['messageType'] = 'Command'
            a['widget'] = 'NLP'
            self.data.append(a)
            print(printHeader('FFBOLab Client NLP') + "Received a command.")
            self.tryComms(a)
            return True
        print(printHeader('FFBOLab Client') + "Procedure ffbo.ui.receive_cmd Registered...")
        
        @FFBOLABClient.register('ffbo.ui.receive_gfx.' + str(FFBOLABClient._async_session._session_id))
        def receiveGFX(data):
            """The Receive GFX function that receives commands and sends them to the GFX frontend.
            
            Args:
                data (dict): Data to be sent to the frontend.

            Returns:
                bool: Whether the data has been received.
            """
            self.clientData.append('Received GFX Data')
            self.data.append(data)
            print(printHeader('FFBOLab Client GFX') + "Received a message for GFX.")
            if self.sendDataToGFX == True:
                self.tryComms(data)
            else:
                if 'messageType' in data.keys():
                    if data['messageType'] == 'showServerMessage':
                        print(printHeader('FFBOLab Client GFX') + "Execution successful for GFX.")
                        if len(self.experimentQueue)>0:
                            print(printHeader('FFBOLab Client GFX') + "Next execution now underway. Remaining simulations: " + str(len(self.experimentQueue)))
                            a = self.experimentQueue.pop(0)
                            res = self.client.session.call('ffbo.gfx.sendExperiment', a)
                            res = self.client.session.call('ffbo.gfx.startExecution', {'name': a['name']})
                        else:
                            self.executionSuccessful = True
                            self.parseSimResults()
                            print(printHeader('FFBOLab Client GFX') + "GFX results successfully parsed.")
            return True
        print(printHeader('FFBOLab Client') + "Procedure ffbo.ui.receive_gfx Registered...")
        
        @FFBOLABClient.register('ffbo.ui.get_circuit.' + str(FFBOLABClient._async_session._session_id))
        def get_circuit(X):
            """Obtain a circuit and save it to the local FFBOLab folder.
            
            Args:
                X (str): Name of the circuit.

            Returns:
                bool: Whether the process has been successful.
            """
            name = X['name']
            G = binascii.unhexlify(X['graph'].encode())
            with open(os.path.join(_FFBOLabDataPath, name + '.gexf.gz'), "wb") as file:
                file.write(G)
            return True
        print("Procedure ffbo.ui.get_circuit Registered...")
        
        @FFBOLABClient.register('ffbo.ui.get_experiment' + str(FFBOLABClient._async_session._session_id))
        def get_experiment(X):
            """Obtain an experiment and save it to the local FFBOLab folder.
            
            Args:
                X (str): Name of the experiment.

            Returns:
                bool: Whether the process has been successful.
            """
            print(printHeader('FFBOLab Client GFX') + "get_experiment called.")
            name = X['name']
            data = json.dumps(X['experiment'])
            with open(os.path.join(_FFBOLabDataPath, name + '.json'), "w") as file:
                file.write(data)
            output = {}
            output['success'] = True
            print(printHeader('FFBOLab Client GFX') + "Experiment save successful.")
            return True
        print("Procedure ffbo.ui.get_experiment Registered...")
        
        @FFBOLABClient.register('ffbo.ui.receive_data.' + str(FFBOLABClient._async_session._session_id))
        def receiveData(data):
            """The Receive Data function that receives commands and sends them to the NLP frontend.
            
            Args:
                data (dict): Data from the backend.

            Returns:
                bool: Whether the process has been successful.
            """
            self.clientData.append('Received Data')
            a = {}
            a['data'] = data
            a['messageType'] = 'Data'
            a['widget'] = 'NLP'
            self.data.append(a)
            print(printHeader('FFBOLab Client NLP') + "Received data.")
            self.tryComms(a)
            return True
        print(printHeader('FFBOLab Client') + "Procedure ffbo.ui.receive_data Registered...")
        
        @FFBOLABClient.register('ffbo.ui.receive_msg.' + str(FFBOLABClient._async_session._session_id))
        def receiveMessage(data):
            """The Receive Message function that receives commands and sends them to the NLP frontend.
            
            Args:
                data (dict): Data from the backend.

            Returns:
                bool: Whether the process has been successful.
            """
            self.clientData.append('Received Message')
            a = {}
            a['data'] = data
            a['messageType'] = 'Message'
            a['widget'] = 'NLP'
            self.data.append(a)
            print(printHeader('FFBOLab Client NLP') + "Received a message.")
            self.tryComms(a)
            return True
        print(printHeader('FFBOLab Client') + "Procedure ffbo.ui.receive_msg Registered...")
        
        self.client = FFBOLABClient # Set current client to the FFBOLAB Client
                
        self.findServerIDs() # Get current server IDs
        
        

    def findServerIDs(self):
        """Find server IDs to be used for the utility functions.
        """
        res = self.client.session.call(u'ffbo.processor.server_information') 

        for i in res['na']:
            if 'na' in res['na'][i]['name']:
                print(printHeader('FFBOLab Client') + 'Found working NA Server: ' + res['na'][i]['name'])
                self.naServerID = i
        for i in res['nlp']:
            self.nlpServerID = i

    def executeNLPquery(self, query = None, language = 'en', uri = None, queryID = None, returnNAOutput = False):
        """Execute an NLP query.
            
        Args:
            query (str): Query string.
            language (str): Language to use.
            uri (str): Currently not used; for future NLP extensions.
            queryID (str): Query ID to be used. Generated automatically.
            returnNAOutput (bool): Whether the corresponding NA query should not be executed.

        Returns:
            dict: NA output or the NA query itself, depending on the returnNAOutput setting.
        """
        if query is None:
            print(printHeader('FFBOLab Client') + 'No query specified. Executing test query "eb".')
            query = 'eb'
        if query.startswith("load "):
            self.sendSVG(query[5:])
        else:
            uri = 'ffbo.nlp.query.' + self.nlpServerID
            queryID = guidGenerator()
            resNA = self.client.session.call(uri , query, language)
            print(printHeader('FFBOLab Client NLP') + 'NLP successfully parsed query.')

            if returnNAOutput == True:
                return resNA
            else:
                self.compiled = False
                res = self.executeNAquery(resNA, queryID = queryID)
                self.sendNeuropils()
                return res

    def executeNAquery(self, res, language = 'en', uri = None, queryID = None, progressive = True, threshold = 5):
        """Execute an NA query.
            
        Args:
            res (dict): Neuroarch query.
            language (str): Language to use.
            uri (str): A custom FFBO query URI if desired.
            queryID (str): Query ID to be used. Generated automatically.
            progressive (bool): Whether the loading should be progressive. Needs to be true most of the time for connection to be stable.
            threshold (int): Data chunk size. Low threshold is required for the connection to be stable.

        Returns:
            bool: Whether the process has been successful.
        """
        def on_progress(x, res):
            res.append(x)
        if isinstance(res, str):
            res = json.loads(res)
        if uri == None:
            uri = 'ffbo.na.query.' + self.naServerID
            if "uri" in res.keys():
                uri = res["uri"] + "." + self.naServerID
        if queryID == None:
            queryID = guidGenerator()
        del self.data # Reset the data in the backend
        self.data = []
        
        res['queryID'] = queryID
        res['threshold'] = threshold
        res['data_callback_uri'] = 'ffbo.ui.receive_data'
        res_list = []
        res = self.client.session.call(uri, res, options=CallOptions(
                on_progress=partial(on_progress, res=res_list)
            ))
        a = {}
        a['data'] = res
        a['messageType'] = 'Data'
        a['widget'] = 'NLP'
        if "retrieve_tag" in uri:
            a['messageType'] = 'TagData'
            self.tryComms(a)
            self.executeNAquery({"command": {"retrieve": {"state": 0}}})
        if progressive == True:
            self.tryComms(a)
            self.data.append(a)
            return self.data
        else:
            self.tryComms(a)
            return a
        
    def getNeuropils(self):
        """Get the neuropils the neurons in the workspace reside in.
            
        Returns:
            list of strings: Set of neuropils corresponding to neurons.
        """
        res = {}
        res['query'] = []
        res['format'] = 'nx'
        res['user'] = 'test'
        res['temp'] = True
        res['query'].append({'action': {'method': {'traverse_owned_by': {'cls': 'Neuropil'}}},
           'object': {'state': 0}})
        res = self.executeNAquery(res)
        neuropils = []
        for i in res:
            try:
                if 'data' in i.keys():
                    if 'data' in i['data'].keys():
                        if 'nodes' in i['data']['data'].keys():
                            a = i['data']['data']['nodes']
                            for j in a.keys():
                                name = a[j]['name']
                                neuropils.append(name)
            except:
                pass
        neuropils = list(set(neuropils))
        return neuropils
    
    def sendNeuropils(self):
        """Pack the list of neuropils into a GFX message.
            
        Returns:
            bool: Whether the messaging has been successful.
        """
        a = {}
        a['data'] = self.getNeuropils()
        print(a['data'])
        a['messageType'] = 'updateActiveNeuropils'
        a['widget'] = 'GFX'
        self.tryComms(a)
        return True
    
    def getInfo(self, args):
        """Get information on a neuron.
            
        Args:
            args (str): Database ID of the neuron or node.

        Returns:
            dict: NA information regarding the node.
        """
        res = {"uri": 'ffbo.na.get_data.', "id": args}
        queryID = guidGenerator()
        res = self.executeNAquery(res, uri = res['uri'] + self.naServerID, queryID = queryID, progressive = False)
        res['data']['data']['summary']['rid'] = args
        a = {}
        a['data'] = res
        a['messageType'] = 'Data'
        a['widget'] = 'INFO'
        self.tryComms(a)
        print(res)
        
        if self.compiled == True:
            a = {}
            name = res['data']['data']['summary']['name']
            if name in self.node_keys.keys():
                data = self.C.G.node['uid' + str(self.node_keys[name])]
                data['uid'] = str(self.node_keys[name])
                a['data'] = data
                a['messageType'] = 'Data'
                a['widget'] = 'JSONEditor'
                self.tryComms(a)
        
        return res
    
    def GFXcall(self, args):
        """Arbitrary call to a procedure in the GFX component format.
        
        Args:
            args (list): A list whose first element is the function name (str) and the following are the arguments.

        Returns:
            dict OR string: The call result.
        """
        print(args[0])

        if isinstance(args, str):
            res = self.client.session.call(args)
        else:
            res = self.client.session.call(args[0], args[1:])
        if type(res) == dict:
            a = res
            a['widget'] = 'GFX'
        else:
            a = {}
            a['data'] = res
            a['messageType'] = 'Data'
            a['widget'] = 'GFX'
        self.tryComms(a)
        return res
    
    def getConnectivity(self):
        """Obtain the connectivity matrix of the current circuit in NetworkX format.
        
        Returns:
            dict: The connectivity dictionary.
        """
        res = json.loads("""
        {"format":"nx","query":[{"action":{"method":{"add_connecting_synapses":{}}},"object":{"state":0}}],"temp":true}
        """)
        res = self.executeNAquery(res)
        return res
    
    
    def sendExecuteReceiveResults(self, circuitName, compile = False):
        """Compiles and sends a circuit for execution in the GFX backend.
        
        Args:
            circuitName (str): The name of the circuit for the backend.
            compile (bool): Whether to compile the circuit first.

        Returns:
            bool: Whether the call was successful.
        """
        print(printHeader('FFBOLab Client GFX') + 'Initiating remote execution for the current circuit.')
        if self.compiled == False:
            compile = True
        if compile == True:
            print(printHeader('FFBOLab Client GFX') + 'Compiling the current circuit.')
            self.prepareCircuit()
        print(printHeader('FFBOLab Client GFX') + 'Circuit prepared. Sending to FFBO servers.')
        self.sendCircuitPrimitive(self.C, args = {'name': circuitName})
        print(printHeader('FFBOLab Client GFX') + 'Circuit sent. Queuing execution.')
        res = self.client.session.call('ffbo.gfx.startExecution', {'name': circuitName})
        return True
        
    
    def prepareCircuit(self):
        """Prepares the current circuit for the Neuroballad format.
        """
        res = self.getConnectivity()

        for data in self.data:
            if data['messageType'] == 'Data':
                connectivity = data['data']['data']

        out_nodes, out_edges, out_edges_unique = self.processConnectivity(connectivity)
        self.out_nodes = out_nodes
        self.out_edges = out_edges
        self.out_edges_unique = out_edges_unique
        C, node_keys = self.GenNB(self.out_nodes, self.out_edges)
        self.C = C
        self.node_keys = node_keys
        self.compiled = True

    def sendCircuit(name = 'temp'):
        """Sends a circuit to the backend.
        
        Args:
            name (str): The name of the circuit for the backend.
        """
        self.sendCircuitPrimitive(self.C, args = {'name': name})


    def processConnectivity(self, connectivity):
        """Processes a Neuroarch connectivity dictionary.
        
        Returns:
            tuple: A tuple of nodes, edges and unique edges.
        """
        edges = connectivity['edges']
        nodes = connectivity['nodes']

        csv = ''
        out_edges = []
        out_nodes = []
        for e_pre in edges:
            if nodes[e_pre]['class'] == 'Neuron':
                if 'uname' in nodes[e_pre].keys():
                    pre = nodes[e_pre]['uname']
                else:
                    pre = nodes[e_pre]['name']
            synapse_nodes = edges[e_pre]

            for synapse in synapse_nodes:
                if nodes[synapse]['class'] == 'Synapse':
                    inferred=0
                else:
                    inferred=1
                if 'N' in nodes[synapse].keys():
                    N = nodes[synapse]['N']
                else:
                    N = 0
                try:
                    post_node = nodes[list(edges[synapse].keys())[0]]
                    if 'uname' in post_node:
                        post = post_node['uname']
                    else:
                        post = post_node['name']
                    csv = csv +  ('\n' + str(pre) + ',' + str(post) + ',' + str(N) + ',' + str(inferred))
                    for i in range(N):
                        out_edges.append((str(pre), str(post)))
                        out_nodes.append(str(pre))
                        out_nodes.append(str(post))
                except:
                    pass
        out_nodes = list(set(out_nodes))
        out_edges_unique = list(set(out_edges))
        return out_nodes, out_edges, out_edges_unique

    def GenNB(self, nodes, edges, config = {}, default_neuron = nb.MorrisLecar(),  default_synapse = nb.AlphaSynapse()):
        """Processes the output of processConnectivity to generate a Neuroballad circuit
        
        Returns:
            tuple: A tuple of the Neuroballad circuit, and a dictionary that maps the neuron names to the uids.
        """
        edge_strengths = []
        unique_edges = list(set(edges))

        edge_strengths = Counter(edges)
        neuron_models = []
        neuron_edges = []
        C = nb.Circuit()
        node_keys = {}
        for i in nodes:
            if i not in config:
                idx = C.add_cluster(1, default_neuron)[0]
                node_keys[i] = idx
        for i in edges:
            if i not in config:
                idx = C.add_cluster(1, default_synapse)[0]
                C.join([[node_keys[i[0]],idx]])
                C.join([[idx, node_keys[i[1]]]])
        return C, node_keys



    def sendCircuitPrimitive(self, C, args = {'name': 'temp'}):
        """Sends a NetworkX graph to the backend.
        """
        C.compile(model_output_name = os.path.join(self.dataPath, 
                                                   args['name'] + '.gexf.gz'))
        with open(os.path.join(self.dataPath, args['name'] + '.gexf.gz'), 'rb') as file:
            data=file.read()
        a = {}
        a['name'] = args['name']
        a['experiment'] = self.experimentInputs
        a['graph'] = binascii.hexlify(data).decode()
        res = self.client.session.call('ffbo.gfx.sendCircuit', a)
        res = self.client.session.call('ffbo.gfx.sendExperiment', a)
        #print(_FFBOLABClient.client.session.call('ffbo.gfx.sendCircuit', a))

    def alter(self, X):
        """Alters a set of models with specified Neuroballad models.
        
       Args:
            X (list of lists): A list of lists. Elements are lists whose first element is the neuron ID (str) and the second is the Neuroballad object corresponding to the model.
        """
        if any(isinstance(el, list) for el in X): # Check if input is a list of lists
            pass
        else:
            X = [X]
        for x in X:
            if x[0] in self.node_keys:
                self.C.G.node['uid' + str(self.node_keys[x[0]])].clear()
                params = x[1].params
                params['name'] = params['name'] + str(self.node_keys[x[0]])
                self.C.G.node['uid' + str(self.node_keys[x[0]])].update(params)
            else:
                raise Exception('The rule you passed named', x, 'does match a known node name.') 
                
    def addInput(self, x):
        """Adds an input to the experiment settings. The input is a Neuroballad input object.
        
        Args:
            x (Neuroballad Input Object): The input object to append to the list of inputs.
            
        Returns:
            dict: The input object added to the experiment list.
        """
        self.experimentInputs.append(x.params)
        data = self.experimentInputs
        a = {}
        a['data'] = data
        a['messageType'] = 'Data'
        a['widget'] = 'JSONEditor'
        self.tryComms(a)
        return x.params
    
    def listInputs(self):
        """Sends the current experiment settings to the frontend for displaying in the JSONEditor.
        """
        a = {}
        data = self.experimentInputs
        a['data'] = data
        a['messageType'] = 'Data'
        a['widget'] = 'JSONEditor'
        self.tryComms(a)
        return self.experimentInputs
    
    def fetchCircuit(self, X, local = True):
        """Deprecated function that locally saves a circuit file via the backend. 
           Deprecated because of connectivity issues with large files.
        """
        X = self.client.session.call(u'ffbo.gfx.getCircuit', X)
        X['data'] = binascii.unhexlify(X['data'].encode())
        if local == False:
            with open(os.path.join(_FFBOLabDataPath, X['name'] + '.gexf.gz'), "wb") as file:
                file.write(X['data'])
        else:
            with open(os.path.join(X['name'] + '.gexf.gz'), "wb") as file:
                file.write(X['data'])
        return True

    def fetchExperiment(self, X, local = True):
        """Deprecated function that locally saves an experiment file via the backend. 
           Deprecated because of connectivity issues with large files.
        """
        X = self.client.session.call(u'ffbo.gfx.getExperiment', X)
        X['data'] = json.dumps(X['data'])
        if local == False:
            with open(os.path.join(_FFBOLabDataPath, X['name'] + '.json'), "w") as file:
                file.write(X['data'])
        else:
            with open(os.path.join(X['name'] + '.json'), "w") as file:
                file.write(X['data'])
        return True
    
    def fetchSVG(self, X, local = True):
        """Deprecated function that locally saves an SVG via the backend. 
           Deprecated because of connectivity issues with large files.
        """
        X = self.client.session.call(u'ffbo.gfx.getSVG', X)
        X['data'] = binascii.unhexlify(X['data'].encode())
        # X['data'] = json.dumps(X['data'])
        if local == False:
            with open(os.path.join(_FFBOLabDataPath, X['name'] + '.svg'), "wb") as file:
                file.write(X['data'])
        else:
            with open(os.path.join(X['name'] + '.svg'), "wb") as file:
                file.write(X['data'])
        return True
    
    def sendSVG(self, X):
        """Deprecated function that loads an SVG via the backend. 
           Deprecated because of connectivity issues with large files.
        """
        name = X
        #with open(os.path.join(_FFBOLabDataPath, name + '.svg'), "r") as file:
        #        svg = file.read()
        a = {}
        #a['data'] = svg
        a['data'] = X
        a['messageType'] = 'loadCircuit'
        a['widget'] = 'GFX'
        self.tryComms(a)
        
    def FICurveGenerator(self, model):
        """Sample library function showing how to do automated experimentation using FFBOLab's Notebook features. Takes a simple abstract neuron model and runs experiments on it.
        
        Args:
            model (Neuroballad Model Object): The model object to test.
            
        Returns:
            numpy array: A tuple of NumPy arrays corresponding to the X and Y of the FI curve.
        """
        del self.data
        self.data = []
        self.sendDataToGFX = False
        del self.C
        self.C = nb.Circuit()
        idx = self.C.add_cluster(1, model)[0]
        self.experimentInputs = []
        self.addInput(
            nb.InIStep(0, 5., 0., 1.))
        self.executionSuccessful = True
        circuitName = "FITest"
        self.sendCircuitPrimitive(self.C, args = {'name': circuitName})
        print(printHeader('FFBOLab Client GFX') + 'Circuit sent. Queuing execution.')
        
        for stepAmplitude in range(30):
            #while self.executionSuccessful == False:
            #    sleep(1)
            self.experimentInputs = []
            self.addInput(
                nb.InIStep(0, float(stepAmplitude), 0., 1.))
            #
            a = {}
            a['name'] = "FITest"
            a['experiment'] = self.experimentInputs
            self.experimentQueue.append(a)
        self.executionSuccessful = False
        a = self.experimentQueue.pop(0)
        # self.parseSimResults()
        res = self.client.session.call('ffbo.gfx.sendExperiment', a)
        res = self.client.session.call('ffbo.gfx.startExecution', {'name': circuitName})

        
        return True
        
    def parseSimResults(self):
        numpyData = {}
        for x in self.data:
            if type(x['data']) is dict:
                print(x['data'].keys())
                for i in x['data'].keys():
                    if i not in numpyData.keys():
                        numpyData[i] = x['data'][i]
                    else:
                        numpyData[i] += x['data'][i]
        self.simData = numpyData
        

    def loadCartridge(self, cartridgeIndex = 100):
        """Sample library function for loading cartridges, showing how one can build libraries that work with FFBOLab.
        """
        cartridge_index = str(cartridge_index)

        queryList = [
            '{"query":[{"action":{"method":{"query":{"name":["lamina"]}}},"object":{"class":"LPU"}},{"action":{"method":{"traverse_owns":{"cls":"CartridgeModel","name":"cartridge_' + cartridge_index +'"}}},"object":{"memory":0}},'+ #1
            '{"action":{"method":{"traverse_owns":{"instanceof":"MembraneModel"}}},"object":{"memory":0}},'+ #2
            '{"action":{"method":{"traverse_owns":{"instanceof":"DendriteModel"}}}, "object":{"memory":1}},'+ #3
            '{"action":{"op":{"__add__":{"memory":0}}},"object":{"memory":1}},'+ #4
            '{"action":{"method":{"traverse_owns":{"cls":"Port"}}},"object":{"memory":3}},'+ #5
            '{"action":{"op":{"__add__":{"memory":0}}},"object":{"memory":1}},' +#6
            '{"action":{"method":{"gen_traversal_in":{"min_depth":2,"pass_through":[["SendsTo","SynapseModel","instanceof"],["SendsTo","MembraneModel","instanceof"]]}}},"object":{"memory":0}},{"action":{"method":{"has":{"name":"Amacrine"}}},"object":{"memory":0}},' +#7
            '{"action":{"method":{"gen_traversal_in":{"min_depth":2,"pass_through":[["SendsTo","SynapseModel","instanceof"],["SendsTo","Aggregator","instanceof"]]}}},"object":{"memory":2}},{"action":{"method":{"has":{"name":"Amacrine"}}},"object":{"memory":0}},' +#8
            '{"action":{"method":{"gen_traversal_out":{"min_depth":2,"pass_through":[["SendsTo","SynapseModel","instanceof"],["SendsTo","MembraneModel","instanceof"]]}}},"object":{"memory":4}},{"action":{"method":{"has":{"name":"Amacrine"}}},"object":{"memory":0}},' + #9
            '{"action":{"method":{"gen_traversal_out":{"min_depth":2,"pass_through":[["SendsTo","SynapseModel","instanceof"],["SendsTo","Aggregator","instanceof"]]}}},"object":{"memory":6}},{"action":{"method":{"has":{"name":"Amacrine"}}},"object":{"memory":0}},' + #10 -- ports
            '{"action":{"op":{"__add__":{"memory":2}}},"object":{"memory":0}},' + #11
            '{"action":{"op":{"__add__":{"memory":6}}},"object":{"memory":0}},' + #12
            '{"action":{"op":{"__add__":{"memory":8}}},"object":{"memory":0}},' + #13
            '{"action":{"op":{"__add__":{"memory":11}}},"object":{"memory":0}},' + #14
            '{"action":{"method":{"get_connecting_synapsemodels":{}}},"object":{"memory":0}},' + #15 --> ports
            '{"action":{"op":{"__add__":{"memory":1}}},"object":{"memory":0}},' + #16
            '{"action":{"method":{"get_connected_ports":{}}},"object":{"memory":1}},' + #17
            '{"action":{"op":{"__add__":{"memory":1}}},"object":{"memory":0}},' + #18 lam_comps
            '{"action":{"method":{"query":{"name":["retina-lamina"]}}},"object":{"class":"Pattern"}},' + #19
            '{"action":{"method":{"owns":{"cls":"Interface"}}},"object":{"memory":0}},' + #20
            '{"action":{"op":{"__add__":{"memory":0}}},"object":{"memory":1}},' + #21
            '{"action":{"op":{"find_matching_ports_from_selector":{"memory":20}}},"object":{"memory":1}},' +  #22
            '{"action":{"op":{"__add__":{"memory":0}}},"object":{"memory":1}},' + #23
            '{"action":{"method":{"get_connected_ports":{}}},"object":{"memory":0}},' + #24
            '{"action":{"op":{"__add__":{"memory":0}}},"object":{"memory":1}},' + #25 pat1
            '{"action":{"method":{"query":{"name":["retina"]}}},"object":{"class":"LPU"}},' + #26 -> lam_comps
            '{"action":{"op":{"find_matching_ports_from_selector":{"memory":1}}},"object":{"memory":0}},' + #27
            '{"action":{"method":{"gen_traversal_in":{"pass_through":["SendsTo", "MembraneModel","instanceof"]}}},"object":{"memory":0}},' + #28 ret_comp
            '{"action":{"op":{"__add__":{"memory":10}}},"object":{"memory":0}},' + #29
            '{"action":{"op":{"__add__":{"memory":4}}},"object":{"memory":0}}],' + #30
            '"format":"no_result"}',
            '{"query":[{"action":{"method":{"has":{}}},"object":{"state":0}}],"format":"nx"}']

        for i in queryList:
            res = _FFBOLABClient.executeNAquery(json.loads(i))
        G=nx.Graph(res[1]['data']['data'])
        self.C.G = G
        return True