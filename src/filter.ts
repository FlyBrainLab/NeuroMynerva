// copied from tabulator-tables/src/js/modules/Filter/defaults/filters.js
const defaultFilters = {
  //equal to
  '=': function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    return Number(rowVal) === Number(filterVal) ? true : false;
  },

  //less than
  '<': function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    return Number(rowVal) < Number(filterVal) ? true : false;
  },

  //less than or equal to
  '<=': function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    return Number(rowVal) <= Number(filterVal) ? true : false;
  },

  //greater than
  '>': function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    return Number(rowVal) > Number(filterVal) ? true : false;
  },

  //greater than or equal to
  '>=': function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    return Number(rowVal) >= Number(filterVal) ? true : false;
  },

  //not equal to
  '!=': function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    return Number(rowVal) !== Number(filterVal) ? true : false;
  },

  regex: function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    if (typeof filterVal === 'string') {
      try {
        const filter = new RegExp(filterVal);
        return filter.test(rowVal);
      } catch (error) {
        return false;
      }
    }
  },
  //contains the string
  like: function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    if (filterVal === null || typeof filterVal === 'undefined') {
      return rowVal === filterVal ? true : false;
    } else {
      if (typeof rowVal !== 'undefined' && rowVal !== null) {
        return (
          String(rowVal).toLowerCase().indexOf(filterVal.toLowerCase()) > -1
        );
      } else {
        return false;
      }
    }
  },

  //contains the keywords
  keywords: function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    const keywords = filterVal
        .toLowerCase()
        .split(
          typeof filterParams.separator === 'undefined'
            ? ' '
            : filterParams.separator
        ),
      value = String(
        rowVal === null || typeof rowVal === 'undefined' ? '' : rowVal
      ).toLowerCase(),
      matches = [];

    keywords.forEach(keyword => {
      if (value.includes(keyword)) {
        matches.push(true);
      }
    });

    return filterParams.matchAll
      ? matches.length === keywords.length
      : !!matches.length;
  },

  //in array
  in: function (
    filterVal: string,
    rowVal: string,
    rowData: string,
    filterParams: any
  ): boolean {
    if (Array.isArray(filterVal)) {
      return filterVal.length ? filterVal.indexOf(rowVal) > -1 : true;
    } else {
      console.warn('Filter Error - filter value is not an array:', filterVal);
      return false;
    }
  }
};

export function combinedFilter(
  filterVal: string,
  rowVal: string,
  rowData: string,
  filterParams: any
): boolean {
  if (defaultFilters['like'](filterVal, rowVal, rowData, filterParams)) {
    return true;
  }
  if (defaultFilters['keywords'](filterVal, rowVal, rowData, filterParams)) {
    return true;
  }
  if (defaultFilters['regex'](filterVal, rowVal, rowData, filterParams)) {
    return true;
  }
  return false;
}

export function numberFilter(
  filterVal: string,
  rowVal: string,
  rowData: string,
  filterParams: any
): boolean {
  if (isNumeric(filterVal)) {
    return defaultFilters['>='](filterVal, rowVal, rowData, filterParams);
  } else {
    const lastCharacters = filterVal.trim().match(/\d+$/);
    if (lastCharacters !== null) {
      const operator = getStringWithoutNumber(filterVal);
      if (operator === '=') {
        return defaultFilters['='](
          lastCharacters[0],
          rowVal,
          rowData,
          filterParams
        );
      }
      if (operator === '>=') {
        return defaultFilters['>='](
          lastCharacters[0],
          rowVal,
          rowData,
          filterParams
        );
      }
      if (operator === '>') {
        return defaultFilters['>'](
          lastCharacters[0],
          rowVal,
          rowData,
          filterParams
        );
      }
      if (operator === '<') {
        return defaultFilters['<'](
          lastCharacters[0],
          rowVal,
          rowData,
          filterParams
        );
      }
      if (operator === '<=') {
        return defaultFilters['<='](
          lastCharacters[0],
          rowVal,
          rowData,
          filterParams
        );
      }
      if (operator === '!=') {
        return defaultFilters['!='](
          lastCharacters[0],
          rowVal,
          rowData,
          filterParams
        );
      }
    }
  }
  return false;
}

function isNumeric(str: string): boolean {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}

function getStringWithoutNumber(str: string): string {
  const trimmedStr = str.trim();
  const matchResult = trimmedStr.match(/^(.*?)(\d+)$/);

  if (matchResult) {
    const stringWithoutNumber = matchResult[1].replace(/\s/g, '');
    return stringWithoutNumber;
  }

  return trimmedStr.replace(/\s/g, '');
}
