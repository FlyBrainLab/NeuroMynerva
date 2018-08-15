interface JQuery {
    tabulator();
    tabulator(options?:any);
    tabulator(option: string, data: any);
    tabulator(option: "setData", url: string, urlData: {}, ajaxConfig: {});
}