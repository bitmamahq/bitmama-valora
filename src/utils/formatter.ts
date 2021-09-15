const currencyMap = {
  ngn: "en-NG",
  ghs: "en-GH",
};

const formatter = (currency:string) =>
  new Intl.NumberFormat(currencyMap[currency], {
    style: "currency",
    currency: String(currency).toUpperCase(),

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

const currencyFormat = (currency:string) => formatter(String(currency).toLowerCase());

export const floatString = (n:number) =>
  (n && (Number.isInteger(n) ? n.toFixed(1) : n.toString())) ?? "";

  export const toUpper = (s:string) =>
  (s ? String(s).toUpperCase() : "");


export default currencyFormat;
