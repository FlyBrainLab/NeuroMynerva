import * as React from "react";
import '../../../style/widgets/info-widget/summary.css';
const SUMMARY_TABLE_SUBHEADER_CLASS = "jp-FBL-Info-summary-table-header";

const displayData: {[rawName: string]: string} = {
  uname: "Unique Name",
  name: "Type",
  class: "Class",
  data_source: "Data Source",
  referenceId: "ID in Data Source",
  transgenic_lines: "Transgenic Lines",
  transmitters: "Neurotransmitters"
}

const morphData: {[rawName: string]: string} = {
  totalLength: "Total Length",
  totalSurfaceArea: "Total Surface Area",
  totalVolume: "Total Volume",
  maximumEuclideanDistance: "Max. Euclidean Distance",
  width: "Width",
  height: "Height",
  depth: "Depth",
  numberOfBifurcations: "N. Bifurcations",
  maxPathDistance: "Max. Path Dist.",
  averageDiameter: "Average Diam."
}

/**
 * Reformat Field
 * Convert Arrays and Objects to table-friendly rendering
 */
function reformatField(id: string, value: any) {
  if (typeof(value) === 'string') {
    return value as string;
  } else if (Array.isArray(value)) {
    let items: any = [];
    value.forEach((v, idx)=>{
      items.push(<option key={idx} value={v as string}>{v as string}</option>);
    });
    return (
      <select id={id}>
        {items}
      </select>
    )
  } else if (typeof(value) === 'object') {
    // let keys = Object.keys(value);
    let items: any = [];
    for (const [key, val] of Object.entries(value)) {
      items.push(<option key={key} value={val as string}>{key as string}: {val as string}</option>);
    }
    return (
      <select id={id}>
        {items}
      </select>
    )
  } else {
    return '';
  }
}


// /**
//  * Toggle button add/remove on click. Button stateful to if neuron in workspace
//  * @param rid 
//  * @param uname 
//  * @param neu3d 
//  */
// function onAddRemoveClick(rid:string, uname: string, neu3d: any) {
//   let button = document.getElementById("info-summarytable-addremove-neuron");
//   if (neu3d.isInWorkspace(rid)) {
//     neu3d.removeByUname(uname).then(()=>{
//       if (neu3d.isInWorkspace(rid)) {
//         button.innerHTML = '-';
//       } else {
//         button.innerHTML = '+';
//       }
//     })
//   } else {
//     neu3d.addByUname(uname).then(()=>{
//       if (neu3d.isInWorkspace(rid)) {
//         button.innerHTML = '-';
//       } else {
//         button.innerHTML = '+';
//       }
//     })
//   }
// }

/**
 * Display Summary Table in table format
 * @param props 
 */
export function SummaryTable(props: {data: any, neu3d: any }) {
  const rawData = props.data;
  let display: any[] = [];
  let morph: any[] = [];
  let info: any[] = [];

  for (let [key, val] of Object.entries(rawData)) {
    if (val == undefined || val == null) {
      continue;
    }
    if (key in displayData) { 
      if (key.toLowerCase() === "uname") {
        display.unshift(
          <tr key={key}>
            <td><b>{displayData[key]}</b></td>
            <td>{reformatField(key, val)}
              {/* <button onClick={()=>{
                onAddRemoveClick(props.data.orid, props.data.uname, props.neu3d)}}
                id="info-summarytable-addremove-neuron"
              >{props.neu3d.isInWorkspace(props.data.orid) ? '-' : '+'}</button> */}
            </td>
          </tr>
        );
      } else {
        display.push(<tr key={key}>
          <td>{displayData[key]}</td>
          <td>{reformatField(key, val)}</td>
        </tr>);
      }
    } else if (key in morphData) {
      morph.push(
        <tr key={key}>
          <td>{morphData[key]}</td>
          <td>{reformatField(key, val)}</td>
        </tr>
      );
    } else if (key === 'info') { // object of abitrary data
      for (let [key2, val2] of Object.entries(val)) {
        info.push(
          <tr key={key2}>
            <td>{jsUcfirst(key2)}</td>
            <td>{reformatField(key2, val2)}</td>
          </tr>
        );
      }
    }
  }

  if (display.length > 0) {
    return (
      <>
        <div 
        className={"jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput"}
        data-mime-type={"text/markdown"}
        >
          <table className={"summary-table"}>
            <tbody>
              {display}
            </tbody>
          </table>
          {() => {
            if (morph.length > 0) {
              return (
                <>
                  <div className={SUMMARY_TABLE_SUBHEADER_CLASS}>Morphometry</div>
                    <table className={"summary-table"}>
                      <tbody>
                        {morph}
                      </tbody>
                    </table>
                </>
              )
            } else {
              return <></>;
            }
          }}
          {() => {
            if (info.length > 0) {
              return (
                <>
                <div className={SUMMARY_TABLE_SUBHEADER_CLASS}>Additional Information</div>
                <table className={"summary-table"}>
                  <tbody>
                    {info}
                  </tbody>
                </table>
                </>
              )
            } else {
              return <></>
            }
          }}
          
        </div>
      </>
    );
  } else {
    return (
      <>
        No summary information available
      </>
    );
  }
}

/**
 * capitalizes first character in a given string
 * @param orig original string
 */
function jsUcfirst(orig: string): string {
  return orig.charAt(0).toUpperCase() + orig.slice(1);
}
