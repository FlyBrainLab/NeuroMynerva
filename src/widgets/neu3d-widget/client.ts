import { FBLClient } from '../template-widget/client';
import { InfoQueryCode } from '../template-widget/python_code_templates';

/**
 * Client associated with neu3d widget
 *
 * This class wraps all the interaction with client
 */
export class Neu3DClient extends FBLClient{
    /**
     * Add an object into the workspace using Uname by Kernel Call.
     *
     * @param uname -  uname of target object (neuron/synapse)
     */
    async addByUname(uname: string | Array<string>): Promise<boolean> {
        let code = `
_fbl_query = {}
_fbl_query['verb'] = 'add'
_fbl_query['query']= [{'action': {'method': {'query': {'uname': ${JSON.stringify(uname)}}}},
                       'object': {'class': ['Neuron', 'Synapse']}}]
        `;
        return this.executeNAQuery(code);
    }


    /**
     * Remove an object into the workspace using Uname by Kernel Call.
     *
     * @param uname -  uname of target object (neuron/synapse)
     */
    async removeByUname(uname: string | Array<string>): Promise<boolean> {
        let code = `
_fbl_query = {}
_fbl_query['verb'] = 'remove'
_fbl_query['query']= [{'action': {'method': {'query': {'uname': ${JSON.stringify(uname)}}}},
                       'object': {'class': ['Neuron', 'Synapse']}}]
        `;
        return this.executeNAQuery(code);
    }


    /**
     * Add an object into the workspace using Rid by Kernel Call.
     *
     * @param rid -  rid of target object (neuron/synapse)
     */
    async addByRid(rid: string | Array<string>): Promise<boolean> {
        let code = `
_fbl_query = {}
_fbl_query['verb'] = 'add'
_fbl_query['query']= [{'action': {'method': {'query': {'rid': ${JSON.stringify(rid)}}}},
                       'object': {'rid': ${JSON.stringify(rid)}}}]
_fbl_query['format'] = 'morphology'
        `;
        return this.executeNAQuery(code);
    }


    /**
     * Remove an object from the workspace using Rid by Kernel Call.
     *
     * @param rid -  rid of target object (neuron/synapse)
     */
    async removeByRid(rid: string | Array<string>): Promise<boolean> {
        let code = `
_fbl_query = {}
_fbl_query['verb'] = 'remove'
_fbl_query['query']= [{'action': {'method': {'query': {'rid': ${JSON.stringify(rid)}}}},
                       'object': {'rid': ${JSON.stringify(rid)}}}]
        `;
        return this.executeNAQuery(code);
    }

    /**
     * Get Info of a given neuron
     * @param rid - rid of the neuron/synapse to query info about
     * @return a promise that resolves to the reply message when done
     */
    async executeInfoQuery(rid: string): Promise<boolean> {
        return this.executeCode(InfoQueryCode(this.clientId, rid), 'Info Query');
    }
}