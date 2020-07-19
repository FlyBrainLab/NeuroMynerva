import "@fortawesome/fontawesome-free/js/all.js";
import "tabulator-tables/dist/css/tabulator.min.css";
export declare class ConnTable {
    constructor(props: {
        container: any;
        data: any;
        neu3d: any;
    });
    hasSynMorph(connData: Array<any>): boolean;
    removeSynColumn(): void;
    addSynColumn(): void;
    readonly synColumn: {
        title: string;
        field: string;
        hozAlign: string;
        headerFilter: boolean;
        headerFilterParams: {
            true: string;
            false: string;
        };
        headerFilterPlaceholder: string;
        width: number;
        formatter: (cell: any, formatterParams: any) => "<i class='fa fa-minus-circle' > </i>" | "<i class='fa fa-plus-circle' > </i>";
        cellClick: (e: any, cell: any) => void;
    };
    readonly columns: ({
        title: string;
        field: string;
        hozAlign: string;
        headerFilter: boolean;
        headerFilterParams: {
            true: string;
            false: string;
        };
        headerFilterPlaceholder: string;
        width: number;
        formatter: (cell: any, formatterParams: any) => "<i class='fa fa-minus-circle' > </i>" | "<i class='fa fa-plus-circle' > </i>";
        cellClick: (e: any, cell: any) => void;
        headerFilterFunc?: undefined;
    } | {
        title: string;
        field: string;
        hozAlign: string;
        headerFilter: boolean;
        headerFilterPlaceholder: string;
        headerFilterParams?: undefined;
        width?: undefined;
        formatter?: undefined;
        cellClick?: undefined;
        headerFilterFunc?: undefined;
    } | {
        title: string;
        field: string;
        hozAlign: string;
        headerFilter: string;
        headerFilterPlaceholder: string;
        headerFilterFunc: string;
        width: number;
        headerFilterParams?: undefined;
        formatter?: undefined;
        cellClick?: undefined;
    })[];
    data: any;
    tabulator: any;
    neu3d: any;
}
