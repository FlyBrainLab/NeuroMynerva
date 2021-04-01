import { FBLClient, IExecuteResult } from './../template-widget/client';

type MeshTypes =
  | 'Neuropil'
  | 'Tract'
  | 'Subregion'
  | 'Tract'
  | 'Subsystem'
  | Array<string>;

export class Neu3DClient extends FBLClient {
  /**
   * Get Meshes from DB
   *
   * @param type type of the mesh to get from database
   */
  getMeshesfromDB(type?: MeshTypes): Promise<IExecuteResult> {
    type = type ?? ['Neuropil', 'Tract', 'Subregion', 'Tract', 'Subsystem'];
    const query = `
    _fbl_query = {}
    _fbl_query['verb'] = 'add'
    _fbl_query['format'] = 'morphology'
    _fbl_query['query']= [{'action': {'method': {'query': {}}},
                           'object': {'class': ${JSON.stringify(type)}}}]
    `;
    return this.executeNAQuery(query);
  }

  /**
   * Add an object into the workspace using Uname by Kernel Call.
   *
   * WARNING: Deprecated! Do not use Uname-based queries since uname may
   *   no longer be unique. Use addByRid instead
   * @param uname uname of target object (neuron/synapse)
   */
  addByUname(uname: string | Array<string>): Promise<any> {
    const query = `
    _fbl_query = {}
    _fbl_query['verb'] = 'add'
    _fbl_query['query']= [{'action': {'method': {'query': {'uname': ${JSON.stringify(
      uname
    )}}}},
                    'object': {'class': ['Neuron', 'Synapse']}}]
    `;
    return this.executeNAQuery(query);
  }

  /**
   * Remove an object into the workspace using Uname by Kernel Call.
   *
   * WARNING: Deprecated! Do not use Uname-based queries since uname may
   *   no longer be unique. Use addByRid instead
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  removeByUname(uname: string | Array<string>): Promise<any> {
    const query = `
    _fbl_query = {}
    _fbl_query['verb'] = 'remove'
    _fbl_query['query']= [{'action': {'method': {'query': {'uname': ${JSON.stringify(
      uname
    )}}}},
                    'object': {'class': ['Neuron', 'Synapse']}}]
    `;
    return this.executeNAQuery(query);
  }

  /**
   * Add an object into the workspace using Rid by Kernel Call.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  addByRid(rid: string | Array<string>): Promise<any> {
    const query = `
    _fbl_query = {}
    _fbl_query['verb'] = 'add'
    _fbl_query['query']= [{'action': {'method': {'query': {}}},
                    'object': {'rid': ${JSON.stringify(rid)}}}]
    _fbl_query['format'] = 'morphology'
    `;
    return this.executeNAQuery(query);
  }

  /**
   * Remove an object from the workspace using Rid by Kernel Call.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  removeByRid(rid: string | Array<string>): Promise<any> {
    const query = `
    _fbl_query = {}
    _fbl_query['verb'] = 'remove'
    _fbl_query['query']= [{'action': {'method': {'query': {}}},
                    'object': {'rid': ${JSON.stringify(rid)}}}]
    `;
    return this.executeNAQuery(query);
  }

  /**
   * Get Info of a given neuron
   * @param rid - rid of the neuron/synapse to query info about
   * @return a promise that resolves to the reply message when done
   */
  executeInfoQuery(rid: string): Promise<IExecuteResult> {
    const code = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.widget.id}'].client_id]['client'].getInfo('${rid}')
    `;
    return this.executeCode(code, '[Neu3D] Get Info', false);
  }
}
