// Summary Table that renders the metadata of a given neuron
// in a table format
import * as React from 'react';
import '../../../style/info-widget/summary.css';

const displayData: { [rawName: string]: string } = {
  uname: 'Unique Name',
  name: 'Type',
  class: 'Class',
  data_source: 'Data Source',
  referenceId: 'ID in Data Source',
  transgenic_lines: 'Transgenic Lines',
  transmitters: 'Neurotransmitters'
};

const morphData: { [rawName: string]: string } = {
  totalLength: 'Total Length',
  totalSurfaceArea: 'Total Surface Area',
  totalVolume: 'Total Volume',
  maximumEuclideanDistance: 'Max. Euclidean Distance',
  width: 'Width',
  height: 'Height',
  depth: 'Depth',
  numberOfBifurcations: 'N. Bifurcations',
  maxPathDistance: 'Max. Path Dist.',
  averageDiameter: 'Average Diam.'
};

/**
 * Reformat Field
 * Convert Arrays and Objects to table-friendly rendering
 */
function reformatField(id: string, value: any) {
  if (typeof value === 'string') {
    return value as string;
  } else if (Array.isArray(value)) {
    const items: any = [];
    value.forEach((v, idx) => {
      items.push(
        <option key={idx} value={v as string}>
          {v as string}
        </option>
      );
    });
    return <select id={id}>{items}</select>;
  } else if (typeof value === 'object') {
    // let keys = Object.keys(value);
    const items: any = [];
    for (const [key, val] of Object.entries(value)) {
      items.push(
        <option key={key} value={val as string}>
          {key as string}: {val as string}
        </option>
      );
    }
    return <select id={id}>{items}</select>;
  } else {
    return '';
  }
}

/**
 * Display Summary Table in table format
 * @param props
 */
export function SummaryTable(props: { data: any; neu3d: any }): JSX.Element {
  const rawData = props.data;
  const display: any[] = [];

  for (const [key, val] of Object.entries(rawData)) {
    if (val === undefined || val === null) {
      continue;
    }
    if (key in displayData) {
      if (key.toLowerCase() === 'uname') {
        display.unshift(
          <tr key={key}>
            <td>
              <b>{displayData[key]}</b>
            </td>
            <td>
              {reformatField(key, val)}
              {/* <button onClick={()=>{
                onAddRemoveClick(props.data.orid, props.data.uname, props.neu3d)}}
                id="info-summarytable-addremove-neuron"
              >{props.neu3d.isInWorkspace(props.data.orid) ? '-' : '+'}</button> */}
            </td>
          </tr>
        );
      } else {
        display.push(
          <tr key={key}>
            <td>{displayData[key]}</td>
            <td>{reformatField(key, val)}</td>
          </tr>
        );
      }
    }
  }

  if (display.length > 0) {
    return (
      <>
        <div
          className={
            'jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput'
          }
          data-mime-type={'text/markdown'}
        >
          <table className={'summary-table'}>
            <tbody>{display}</tbody>
          </table>
        </div>
      </>
    );
  } else {
    return <>No summary information available</>;
  }
}

/**
 * Display MorphoMetry in table format
 * @param props
 */
export function MorphometryTable(props: {
  data: any;
  neu3d: any;
}): JSX.Element {
  const rawData = props.data;
  const morph: any[] = [];

  for (const [key, val] of Object.entries(rawData)) {
    if (val === undefined || val === null) {
      continue;
    }
    if (key in morphData) {
      morph.push(
        <tr key={key}>
          <td>{morphData[key]}</td>
          <td>{reformatField(key, val)}</td>
        </tr>
      );
    }
  }

  if (morph.length > 0) {
    return (
      <>
        <div
          className={
            'jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput'
          }
          data-mime-type={'text/markdown'}
        >
          <table className={'morphometry-table'}>
            <tbody>{morph}</tbody>
          </table>
        </div>
      </>
    );
  } else {
    return <>No Morphometry Information Available</>;
  }
}

/**
 * Display Additional Info in table format
 * @param props
 */
export function AdditionalInfoTable(props: {
  data: any;
  neu3d: any;
}): JSX.Element {
  const rawData = props.data;
  const info: any[] = [];

  for (const [key, val] of Object.entries(rawData)) {
    if (val === undefined || val === null) {
      continue;
    }
    if (key === 'info') {
      // object of abitrary data
      for (const [key2, val2] of Object.entries(val)) {
        info.push(
          <tr key={key2}>
            <td>{jsUcfirst(key2)}</td>
            <td>{reformatField(key2, val2)}</td>
          </tr>
        );
      }
    }
  }

  if (info.length > 0) {
    return (
      <>
        <div
          className={
            'jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput'
          }
          data-mime-type={'text/markdown'}
        >
          <table className={'additional-info-table'}>
            <tbody>{info}</tbody>
          </table>
        </div>
      </>
    );
  } else {
    return <>No Morphometry Information Available</>;
  }
}

/**
 * capitalizes first character in a given string
 * @param orig original string
 */
function jsUcfirst(orig: string): string {
  return orig.charAt(0).toUpperCase() + orig.slice(1);
}
