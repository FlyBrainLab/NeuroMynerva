// an diagram that renders the percentage neuron types pre/post synaptic to a given neuron
// Uses ReCharts to draw PieCharts
import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip, Label } from 'recharts';

const COLORS_PRE = ['#f01a1a', '#f34747', '#f67575', '#f9a3a3', '#fcd1d1'];
const COLORS_POST = ['#2859b8', '#527ac6', '#7e9bd4', '#a9bce2', '#d4ddf0'];

export function ConnSVG(props: { pre: any; post: any }): JSX.Element {
  let pre_arr = [];
  if (props.pre?.profile) {
    for (const [key, number] of Object.entries(props.pre.profile)) {
      pre_arr.push({ name: key, proportion: number });
    }
  }
  pre_arr = pre_arr.sort((a: any, b: any) => {
    return a.proportion - b.proportion;
  });

  let post_arr = [];
  if (props.post?.profile) {
    for (const [key, number] of Object.entries(props.post.profile)) {
      post_arr.push({ name: key, proportion: number });
    }
  }
  post_arr = post_arr.sort((a: any, b: any) => {
    return a.proportion - b.proportion;
  });

  const chunkWidth = 30;
  if (pre_arr.length > 0 || post_arr.length > 0) {
    return (
      <PieChart
        width={chunkWidth * 9}
        height={chunkWidth * 6}
        style={{ margin: '0 auto' }}
      >
        {pre_arr.length ? (
          <Pie
            data={pre_arr}
            isAnimationActive={false}
            cx={chunkWidth * 2}
            cy={chunkWidth * 3}
            innerRadius={chunkWidth}
            outerRadius={chunkWidth * 2}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="proportion"
          >
            {pre_arr.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS_PRE[index % COLORS_PRE.length]}
              />
            ))}
            <Label
              width={30}
              position="center"
              content={
                <PrePost
                  cx={chunkWidth * 2}
                  cy={chunkWidth * 3}
                  pre={true}
                  num={props.pre.number}
                />
              }
            />
          </Pie>
        ) : (
          <p>No Pre</p>
        )}
        {post_arr.length ? (
          <Pie
            data={post_arr}
            isAnimationActive={false}
            cx={chunkWidth * 6.5}
            cy={chunkWidth * 3}
            innerRadius={chunkWidth}
            outerRadius={chunkWidth * 2}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="proportion"
          >
            {post_arr.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS_POST[index % COLORS_POST.length]}
              />
            ))}
            <Label
              width={30}
              position="center"
              content={
                <PrePost
                  cx={chunkWidth * 6.5}
                  cy={chunkWidth * 3}
                  pre={false}
                  num={props.post.number}
                />
              }
            />
          </Pie>
        ) : (
          <p>No Post</p>
        )}
        <Tooltip
          formatter={(value: any, name: any, entry: any) => {
            return `${(value as number).toFixed(2)} %`;
          }}
        />
      </PieChart>
    );
  } else {
    return <>No connectivity profile available</>;
  }
}

/**
 * Label number of synaptic partners pre/post in the same rechart label
 * @param props
 */
function PrePost(props: { cx: number; cy: number; pre: boolean; num: number }) {
  return (
    <React.Fragment>
      <text
        x={props.cx}
        y={props.cy}
        fill="#3d405c"
        className="recharts-text recharts-label"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <tspan alignmentBaseline="baseline" textAnchor="middle" fontSize="15">
          {props.pre ? <>Pre: {props.num}</> : <>Post: {props.num}</>}
        </tspan>
      </text>
    </React.Fragment>
  );
}
