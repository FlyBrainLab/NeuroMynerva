import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, Label } from "recharts";

const COLORS_PRE = ["#f01a1a", "#f34747", "#f67575", "#f9a3a3", "#fcd1d1"];
const COLORS_POST = ["#2859b8", "#527ac6", "#7e9bd4", "#a9bce2", "#d4ddf0"];

export function ConnSVG(props: { pre: any; post: any }) {
  let pre_arr = [];
  if (props.pre.profile) {
    for (let [key, number] of Object.entries(props.pre.profile)) {
      pre_arr.push({ name: key, proportion: number });
    }
  }
  pre_arr = pre_arr.sort((a: any, b: any) => {
    return a.proportion - b.proportion;
  });

  let post_arr = [];
  if (props.post.profile) {
    for (let [key, number] of Object.entries(props.post.profile)) {
      post_arr.push({ name: key, proportion: number });
    }
  }
  post_arr = post_arr.sort((a: any, b: any) => {
    return a.proportion - b.proportion;
  });

  if (pre_arr.length || post_arr.length) {
    return (
      <PieChart width={250} height={250} style={{ margin: "0 auto" }}>
        <Pie
          data={pre_arr}
          isAnimationActive={false}
          cx={100}
          cy={100}
          innerRadius={40}
          outerRadius={60}
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
        </Pie>
        <Pie
          data={post_arr}
          isAnimationActive={false}
          cx={100}
          cy={100}
          innerRadius={70}
          outerRadius={90}
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
                cx={100}
                cy={100}
                pre={props.pre.number}
                post={props.post.number}
              />
            }
          />
        </Pie>
        <Tooltip
          formatter={(value, name, entry) => {
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
function PrePost(props: { cx: number; cy: number; pre: number; post: number }) {
  return (
    <React.Fragment>
      <text
        x={props.cx}
        y={props.cy - 10}
        fill="#3d405c"
        className="recharts-text recharts-label"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <tspan alignmentBaseline="baseline" text-anchor="middle" fontSize="15">
          Pre: {props.pre}
        </tspan>
      </text>
      <text
        x={props.cx}
        y={props.cy + 10}
        fill="#3d405c"
        className="recharts-text recharts-label"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <tspan alignmentBaseline="central" text-anchor="middle" fontSize="15">
          Post: {props.post}
        </tspan>
      </text>
    </React.Fragment>
  );
}
