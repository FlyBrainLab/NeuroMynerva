import { FFBOProcessor } from "../../ffboprocessor";

/**
* Currently Supported FBLClient Version
*
* Version is checked when client is initialized
*/
export const SUPPORTED_FBLCLIENT_VERSION = '0.3.0';

/**
* Code for initializing fbl in the connected kernel
*
* This code does 2 things:
*   1. import `flybrainlab` into global `fbl` singleton if not found
*   2. add current widget to the `fbl.widget_manager`
* @return code to be executed
*/
export function initFBLCode(
  id: string, clientId: string, className: string, commTarget: string
): string {
  return `
if 'fbl' not in globals():
  import flybrainlab as fbl
fbl.init()
fbl.widget_manager.add_widget('${id}', '${clientId}', '${className}', '${commTarget}')
  `;
}


/**
 * Code for initializing a client connected to the current widget
 *
 * This code does the following things:
 *   1. Populate `args` for initializing `flybrainlab.Client` object
 *   2. Initialize flybrainlab if not found (basically doing the same as `initFBL`)
 *   3. If client for current widget (with `clientId`) not found, create new
 *      client and comm and register to `fbl.client_manager`
 *   4. If client for current widget is found, then
 *      - if the client is connected to a different URL as specified by the current
 *        `processor`, then the old client is removed and a new one is created with the
 *        current URL
 *      - otherwise do not change client
 *   5. If current widget not found in `fbl.widget_manager`, add it
 *
 * @param processor name of the processor setting to use, needs to be
 *   an entry in `this.ffboProcessors` that reflects the FBL Schema
 */
export function initClientCode(
  processor: string, ffboProcessors: FFBOProcessor.IProcessors,
  widgetId: string, clientId: string
): string {
  const currentProcessor = ffboProcessors[processor];
  const websocket = currentProcessor.AUTH.ssl === true ? 'wss' : 'ws';
  const url = `${websocket}://${currentProcessor.SERVER.IP}/ws`;

  // FIXME: ssl=True won't work for now, force to be False (default)
  let args = `
  user='${currentProcessor.USER.user}',
  secret='${currentProcessor.USER.secret}',
  ssl=False,
  debug=${currentProcessor.DEBUG.debug ? 'True': 'False'},
  authentication='${currentProcessor.AUTH.authentication ? 'True': 'False'}',
  url=u'${url}',
  dataset='${currentProcessor.SERVER.dataset[0] as string}',
  realm=u'${currentProcessor.SERVER.realm}',`;
  if (currentProcessor?.AUTH?.ca_cert_file) {
    args += `
    ca_cert_file="${currentProcessor.AUTH.ca_cert_file}",`;
  }
  if (currentProcessor?.AUTH?.intermediate_cer_file) {
    args += `
    intermediate_cer_file='${currentProcessor.AUTH.intermediate_cer_file}',`;
  }

  let code = `
if 'fbl' not in globals():
    import flybrainlab as fbl
    fbl.init()
if '${clientId}' not in fbl.client_manager.clients or fbl.client_manager.get_client('${clientId}') is None:
    _comm = fbl.MetaComm('${clientId}', fbl)
    _client = fbl.Client(FFBOLabcomm=_comm, ${args})
    _client._set_NeuroMynerva_support('${SUPPORTED_FBLCLIENT_VERSION}')
    _client.check_NeuroMynerva_version()
    fbl.client_manager.add_client('${clientId}', _client, client_widgets=['${widgetId}'])
else:
    _client =fbl.client_manager.get_client('${clientId}')
    if _client.url != '${url}' or not _client.connected:
        try:
            _client.client._async_session.disconnect()
            fbl.client_manager.delete_client('${clientId}')
        except Exception as e:
            print('Disconnecting client ${clientId} Failed', e)
            pass
        _client = fbl.client_manager.add_client('${clientId}', _client, client_widgets=['${widgetId}'])
        fbl.client_manager.add_client('${clientId}', _client, client_widgets=['${widgetId}'])
    _client._set_NeuroMynerva_support('${SUPPORTED_FBLCLIENT_VERSION}')
    _client.check_NeuroMynerva_version()
    if '${widgetId}' not in fbl.client_manager.clients['${clientId}']['widgets']:
        fbl.client_manager.clients['${clientId}']['widgets'] += ['${widgetId}']
    _comm = _client.FBLcomm
  `
  return code;
}

/**
 * Run code in kernel to check if FBLClient version is compatible
 */
export function checkFBLClientVersionCode(clientId: string): string {
  return `
_client = fbl.client_manager.get_client('${clientId}')
_client._set_NeuroMynerva_support('${SUPPORTED_FBLCLIENT_VERSION}')
_client.check_NeuroMynerva_version()
  `
}

/**
 * Run code in kernel to check if FBLClient version is compatible
 */
export function checkClientCode(widgetId: string, clientId: string): string {
  return `
try:
    if not fbl.widget_manager.widgets['${widgetId}'].client_id in fbl.client_manager.clients:
        raise Exception('Client not found')
    if fbl.client_manager.get_client('${clientId}') is None:
        raise Exception('Client not found')
    if not fbl.client_manager.get_client('${clientId}').connected:
        raise Exception('Client not connected')
    _client = fbl.client_manager.get_client('${clientId}')
    _client._set_NeuroMynerva_support('${SUPPORTED_FBLCLIENT_VERSION}')
    _client.check_NeuroMynerva_version()
except:
    raise Exception('Client not found')
  `;
}

/**
 * Disconnect current widget's client from the backend client
 * @param widgetId
 * @param clientId
 */
export function disconnectClientCode(widgetId:string, clientId: string): string {
  return `
try:
  del fbl.widget_manager.widgets['${widgetId}']
  if len(fbl.client_manager.clients['${clientId}']>1):
      fbl.client_manager.clients['${clientId}']['widgets'].remove('${widgetId}')
  else:
      del fbl.client_manager.clients['${clientId}']
except:
    pass
  `;
}

export function NAQueryCode(clientId: string, queryDct: string): string {
  return `
${queryDct}
_client = fbl.client_manager.get_client('${clientId}')
_client.executeNAquery(_fbl_query)
  `
}

export function NLPQueryCode(clientId: string, query: string): string {
  return `
_client = fbl.client_manager.get_client('${clientId}')
_client.executeNLPquery(query='${query}')
  `
}

export function InfoQueryCode(clientId: string, rid: string): string {
  return `
_client = fbl.client_manager.get_client('${clientId}')
_client.getInfo('${rid}')
  `
}