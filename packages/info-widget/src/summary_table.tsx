import * as React from "react";
import '../style/summary.css';

const displayData: string[] = [
  "name",
  "class",
  "vfb_id",
  "data_source",
  "transgenic_lines",
  "transmitters",
  "expresses"
];

const flyCircuitData: string[] = [
  "Lineage",
  "Similarneurons",
  "Name",
  "Author",
  "Driver",
  "GenderAge",
  "Stock"
];

const morphData: string[] = [
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

export function SummaryTable(props: { data: any }) {
  const rawData = props.data;
  let display = [];
  let morph = [];
  let flycircuit = [];

  for (let [key, val] of Object.entries(rawData)) {
    if (displayData.indexOf(key) > -1) {
      if (key.toLowerCase() === "name") {
        display.unshift(
          <div key={key}>
            <p>{jsUcfirst(key)}</p>
            <p>{val as string}</p>
          </div>
        );
      } else {
        display.push(
          <div key={key}>
            <p>{jsUcfirst(key)}</p>
            <p>{val as string}</p>
          </div>
        );
      }
    } else if (morphData.indexOf(key) > -1) {
      morph.push(
        <div key={key}>
          <p>{jsUcfirst(key)}</p>
          <p>{val as string}</p>
        </div>
      );
    } else if (key === "flycircuit_data") {
      for (let [key2, val2] of Object.entries(val as object)) {
        if (flyCircuitData.indexOf(key2) > -1) {
          flycircuit.push(
            <div key={key2}>
              <p>{jsUcfirst(key2)}</p>
              <p>{val2}</p>
            </div>
          );
        }
      }
    }
  }

  if (display.length > 0) {
    return (
      <>
        <div className={"table-grid"}>
          {display.concat(flycircuit).concat(morph)}
        </div>
      </>
    );
  } else {
    return (
      <>
        <div className={"table-grid"}>No summary information available</div>
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
