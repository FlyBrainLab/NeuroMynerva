// // FBL Master Widget Class
// import * as React from "react";
// import { makeStyles } from "@material-ui/core/styles";
// import ExpansionPanel from "@material-ui/core/ExpansionPanel";
// import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
// import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
// import Typography from "@material-ui/core/Typography";
// import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
// type IClientConfig = {
//   [key: string]: {
//     [key2: string]: any;
//   };
// };

// const useStyles = makeStyles(theme => ({
//   root: {
//     width: "100%"
//   },
//   heading: {
//     fontSize: theme.typography.pxToRem(15),
//     flexBasis: "33.33%",
//     flexShrink: 0
//   },
//   secondaryHeading: {
//     fontSize: theme.typography.pxToRem(15),
//     color: theme.palette.text.secondary
//   }
// }));

// export function ClientConfigComponent(props: { config: IClientConfig }) {
//   let panels: Array<any> = [];
//   const classes = useStyles();

//   Object.entries(props.config).forEach(value => {
//     let key = value[0];
//     let content = value[1];
//     let details: Array<any> = [];
//     Object.entries(content).forEach(detail=>{
//       details.push(
//         <div key={detail[0]}>
//         <p>{detail[0]}</p>
//         <p>{detail[1]}</p>
//         </div>
//     )});
//     panels.push(
//       <ExpansionPanel key={key}>
//         <ExpansionPanelSummary
//           expandIcon={<ExpandMoreIcon />}
//         >
//           <Typography className={classes.heading}>{key}</Typography>
//           {/* <Typography className={classes.secondaryHeading}>Test</Typography> */}
//         </ExpansionPanelSummary>
//         <ExpansionPanelDetails>
//           {details}
//         </ExpansionPanelDetails>
//       </ExpansionPanel>
//     );
//   });

//   return <div className={classes.root}>{panels}</div>;
// }
