import * as React from "react";
import '../../../style/widgets/info/summary.css';
const displayData = [
    "name",
    "class",
    "vfb_id",
    "data_source",
    "transgenic_lines",
    "transmitters",
    "expresses"
];
const flyCircuitData = [
    "Lineage",
    "Similarneurons",
    "Name",
    "Author",
    "Driver",
    "GenderAge",
    "Stock"
];
const morphData = [
    "totalLength",
    "totalSurfaceArea",
    "totalVolume",
    "maximumEuclideanDistance",
    "width",
    "height",
    "depth",
    "numberOfBifurcations",
    "maxPathDistance",
    "averageDiameter"
];
/**
 * Reformat Field
 */
function reformatField(id, value) {
    if (typeof (value) === 'string') {
        return value;
    }
    else if (Array.isArray(value)) {
        let items = [];
        value.forEach((v, idx) => {
            items.push(React.createElement("option", { key: idx, value: v }, v));
        });
        return (React.createElement("select", { id: id }, items));
    }
    else if (typeof (value) === 'object') {
        // let keys = Object.keys(value);
        let items = [];
        for (const [key, val] of Object.entries(value)) {
            items.push(React.createElement("option", { key: key, value: val },
                key,
                ": ",
                val));
        }
        return (React.createElement("select", { id: id }, items));
    }
    else {
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
export function SummaryTable(props) {
    const rawData = props.data;
    let display = [];
    let morph = [];
    let flycircuit = [];
    for (let [key, val] of Object.entries(rawData)) {
        if (displayData.indexOf(key) > -1) {
            if (key.toLowerCase() === "name") {
                display.unshift(React.createElement("tr", { key: key },
                    React.createElement("td", null, jsUcfirst(key)),
                    React.createElement("td", null, reformatField(key, val))));
            }
            else {
                display.push(React.createElement("tr", { key: key },
                    React.createElement("td", null, jsUcfirst(key)),
                    React.createElement("td", null, reformatField(key, val))));
            }
        }
        else if (morphData.indexOf(key) > -1) {
            morph.push(React.createElement("tr", { key: key },
                React.createElement("td", null, jsUcfirst(key)),
                React.createElement("td", null, reformatField(key, val))));
        }
        else if (key === "flycircuit_data") {
            for (let [key2, val2] of Object.entries(val)) {
                if (flyCircuitData.indexOf(key2) > -1) {
                    flycircuit.push(React.createElement("tr", { key: key2 },
                        React.createElement("td", null, jsUcfirst(key2)),
                        React.createElement("td", null, reformatField(key2, val2))));
                }
            }
        }
    }
    if (display.length > 0) {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "table-grid lm-Widget p-Widget jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput", "data-mime-type": "text/markdown" },
                React.createElement("table", { className: "summary-table" },
                    React.createElement("tbody", null, display.concat(flycircuit).concat(morph))))));
    }
    else {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "table-grid lm-Widget p-Widget jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput", "data-mime-type": "text/markdown" },
                React.createElement("table", { className: "summary-table" },
                    React.createElement("tbody", null,
                        React.createElement("div", { className: "summary-table table-grid" }, "No summary information available"))))));
    }
}
/**
 * capitalizes first character in a given string
 * @param orig original string
 */
function jsUcfirst(orig) {
    return orig.charAt(0).toUpperCase() + orig.slice(1);
}
