from LPULoader import *

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout,
                    format='%(asctime)s %(name)s %(levelname)s %(message)s')
#g_orient = Graph(Config.from_url('/vision_demo','admin', 'admin', initial_drop=True)) # set to True to erase the database
g_orient = Graph(Config.from_url('/na_server','root', 'root', initial_drop=False,
                                 serialization_type=OrientSerialization.Binary))  # set to True to erase the database
g_orient.create_all(Node.registry)
g_orient.create_all(Relationship.registry)

#g_orient.include(Node.registry)
#g_orient.include(Relationship.registry)

vl = NetworkXLoader(g_orient)

# Load LPU data:

vl.logger.info('Loading sample Lamina circuit...')
vl.load_lpu('og_test.gexf.gz', 'OG')
