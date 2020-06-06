import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, Label } from "recharts";

const COLORS_PRE = [
"#f01a1a",
"#f34747",
"#f67575",
"#f9a3a3",
"#fcd1d1",
]
const COLORS_POST = [
  "#2859b8",
  "#527ac6",
  "#7e9bd4",
  "#a9bce2",
  "#d4ddf0",
]

export function ConnSVG(props: { pre: any, post: any }) {
  let pre_arr = [];
  for (let [key, number] of Object.entries(props.pre["profile"])) {
    pre_arr.push({ name: key, proportion: number });
  }
  let post_arr = [];
  for (let [key, number] of Object.entries(props.post["profile"])) {
    post_arr.push({ name: key, proportion: number });
  }
  return (
    <PieChart width={250} height={250}>
      <Pie
        data={pre_arr}
        isAnimationActive={false}
        cx={100}
        cy={100}
        innerRadius={50}
        outerRadius={70}
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
        innerRadius={80}
        outerRadius={100}
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
          content={<PrePost cx={100} cy={100} pre={100} post={100} />}
        />
      </Pie>
      <Tooltip />
    </PieChart>
  );
}

function PrePost(props: { cx: number; cy: number; pre: number; post: number }) {
  return (
    <React.Fragment>
      <text
        x={props.cx}
        y={props.cy-10}
        fill="#3d405c"
        className="recharts-text recharts-label"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <tspan alignmentBaseline="central" fontSize="20">
          Pre: {props.pre}
        </tspan>
      </text>
      <text
      x={props.cx}
      y={props.cy+10}
      fill="#3d405c"
      className="recharts-text recharts-label"
      textAnchor="middle"
      dominantBaseline="central"
    >
      <tspan alignmentBaseline="central" fontSize="20">
        Post: {props.pre}
      </tspan>
    </text>
  </React.Fragment>
  );
}
