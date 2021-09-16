const currencyMap = {
  ngn: "en-NG",
  ng: "en-NG",
  ghs: "en-GH",
  gh: "en-GH",
};

const formatter = (currency:string = "ngn") => {
  try{
    return new Intl.NumberFormat(currencyMap[currency], {
      style: "currency",
      currency: String(currency).toUpperCase(),

      // These options are needed to round to whole numbers if that's what you want.
      //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
      //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });
  } catch(err:any) {
    return new Intl.NumberFormat(currencyMap["ngn"], {
      style: "currency",
      currency: String("ngn").toUpperCase(),

      // These options are needed to round to whole numbers if that's what you want.
      //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
      //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });
  }
}

const currencyFormat = (currency:string) => formatter(String(currency).toLowerCase());

export const floatString = (n:number) =>
  (n && (Number.isInteger(n) ? n.toFixed(1) : n.toString())) ?? "";

  export const toUpper = (s:string) =>
  (s ? String(s).toUpperCase() : "");

export const dateAdd = (date:Date,units: number, interval: "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second") => {
  let ret = new Date(date); //don't change original date
    if(!(date instanceof Date))
      return ret;
    let checkRollover = function() { if(ret.getDate() !== date.getDate()) ret.setDate(0);};
    switch(String(interval).toLowerCase()) {
      case 'year'   :  ret.setFullYear(ret.getFullYear() + units); checkRollover();  break;
      case 'quarter':  ret.setMonth(ret.getMonth() + 3*units); checkRollover();  break;
      case 'month'  :  ret.setMonth(ret.getMonth() + units); checkRollover();  break;
      case 'week'   :  ret.setDate(ret.getDate() + 7*units);  break;
      case 'day'    :  ret.setDate(ret.getDate() + units);  break;
      case 'hour'   :  ret.setTime(ret.getTime() + units*3600000);  break;
      case 'minute' :  ret.setTime(ret.getTime() + units*60000);  break;
      case 'second' :  ret.setTime(ret.getTime() + units*1000);  break;
      // default       :  ret = undefined;  break;
    }
    return ret;
  }


export default currencyFormat;
