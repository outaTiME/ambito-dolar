const loadRates = async () => {
  const url = 'https://api.ambito-dolar.app/fetch';
  const req = new Request(url);
  return await req.loadJSON();
};

const OFFICIAL_TYPE = 'oficial';
const INFORMAL_TYPE = 'informal';
const TOURIST_TYPE = 'turista';
const CCL_TYPE = 'ccl';
const CCL_LEGACY_TYPE = 'cl';
const MEP_TYPE = 'mep';
const WHOLESALER_TYPE = 'mayorista';
const FRACTION_DIGITS = 2;
const SPACE_SEPARATOR = ' ';
const BULLET_SEPARATOR = '•';

const getAvailableRateTypes = () => [
  OFFICIAL_TYPE,
  TOURIST_TYPE,
  INFORMAL_TYPE,
  CCL_TYPE,
  MEP_TYPE,
  WHOLESALER_TYPE,
];

const getRateTitle = (type) => {
  if (type === OFFICIAL_TYPE) {
    return 'Oficial';
  } else if (type === TOURIST_TYPE) {
    return 'Turista';
  } else if (type === INFORMAL_TYPE) {
    return 'Blue';
  } else if (type === CCL_TYPE) {
    // return 'Contado con liquidación',
    return 'CCL';
  } else if (type === MEP_TYPE) {
    return 'MEP';
  } else if (type === WHOLESALER_TYPE) {
    return 'Mayorista';
  }
};

const FALLBACK_LOCALE = 'es-AR';
const DEVICE_LOCALE = [].concat(
  Device.preferredLanguages(),
  FALLBACK_LOCALE
)[0];

const formatNumber = (
  num,
  maxDigits = FRACTION_DIGITS,
  forceFractionDigits = true
) => {
  return num.toLocaleString(DEVICE_LOCALE, {
    ...(forceFractionDigits === true && {
      minimumFractionDigits: maxDigits,
    }),
    maximumFractionDigits: maxDigits,
  });
};

const formatRateCurrency = (num) => formatNumber(num);

const formatCurrency = (num, usd) =>
  (usd === true ? 'US$' : '$') + formatRateCurrency(num);

const getCurrency = (str, include_symbol = true, usd = false) => {
  if (include_symbol === true) {
    if (usd === true) {
      return formatCurrency(str, true);
    }
    return formatCurrency(str);
  }
  return formatRateCurrency(str);
};

const formatRateChange = (num) =>
  (num > 0 ? '+' : '') + formatRateCurrency(num) + '%';

const getInlineRateValue = (value, change) => {
  let value_str;
  if (Array.isArray(value)) {
    value_str = `${getCurrency(
      value[0]
    )}${SPACE_SEPARATOR}${BULLET_SEPARATOR}${SPACE_SEPARATOR}${getCurrency(
      value[1]
    )}`;
  } else {
    value_str = getCurrency(value);
  }
  if (change !== undefined) {
    value_str += `${SPACE_SEPARATOR}(${formatRateChange(change)})`;
  }
  return value_str;
};

const getRateValue = (value) => Math.max(...[].concat(value));

const getChangeSymbol = (num) => (num === 0 ? '=' : num > 0 ? '↑' : '↓');

const getChangeColor = (num) => {
  if (num === 0) {
    return Color.blue();
  } else if (num > 0) {
    return Color.green();
  }
  return Color.red();
};

const addGradientBackground = (widget) => {
  const gradient = new LinearGradient();
  gradient.colors = [new Color('#1C1C1E'), new Color('#0E0E10')];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
};

// const getBackgroundColor = () => new Color('#1C1C1E');

const getForegroundColor = () => Color.white();

const addRateRow = (widget, title, rate) => {
  let rateValueText = getCurrency(getRateValue(rate[1]), false);
  const changeValue = rate[2];
  let rateChangeText = getChangeSymbol(changeValue);
  if (/medium|large/i.test(config.widgetFamily)) {
    rateValueText = getInlineRateValue(rate[1]);
    rateChangeText =
      formatRateChange(changeValue) + SPACE_SEPARATOR + rateChangeText;
  }
  const rateStack = widget.addStack();
  const rateTitleElement = rateStack.addText(title);
  rateTitleElement.textColor = getForegroundColor();
  rateTitleElement.font = Font.mediumSystemFont(12);
  rateTitleElement.lineLimit = 1;
  rateStack.addSpacer();
  const rateValueStack = rateStack.addStack();
  rateValueStack.centerAlignContent();
  const rateValueElement = rateValueStack.addText(rateValueText);
  rateValueElement.textColor = getForegroundColor();
  rateValueElement.font = Font.semiboldMonospacedSystemFont(12);
  rateValueElement.lineLimit = 1;
  rateValueStack.addSpacer(8);
  const rateChangeElement = rateValueStack.addText(rateChangeText);
  rateChangeElement.textColor = getChangeColor(changeValue);
  rateChangeElement.font = Font.semiboldMonospacedSystemFont(12);
};

const createVerticalWidget = async () => {
  const rates = await loadRates();
  const widget = new ListWidget();
  addGradientBackground(widget);
  const mainContainerStack = widget.addStack();
  mainContainerStack.layoutVertically();
  const rateTypes = getAvailableRateTypes();
  rateTypes.forEach((rateType, index) => {
    addRateRow(mainContainerStack, getRateTitle(rateType), rates[rateType]);
    if (index < rateTypes.length - 1) {
      mainContainerStack.addSpacer();
    }
  });
  // refresh widget automatically
  // const nextRefresh = Date.now() + 1000;
  // widget.refreshAfterDate = new Date(nextRefresh);
  return widget;
};

const createHorizontalWidget = async () => {
  const rates = await loadRates();
  const widget = new ListWidget();
  addGradientBackground(widget);
  const mainContainerStack = widget.addStack();
  mainContainerStack.layoutHorizontally();
  const rateTypes = getAvailableRateTypes();
  // title
  const rateTitleStack = mainContainerStack.addStack();
  rateTitleStack.layoutVertically();
  rateTypes.forEach((rateType, index) => {
    const value = getRateTitle(rateType);
    const rateTitleElement = rateTitleStack.addText(value);
    rateTitleElement.textColor = getForegroundColor();
    rateTitleElement.font = Font.semiboldSystemFont(12);
    rateTitleElement.lineLimit = 1;
    if (index < rateTypes.length - 1) {
      rateTitleStack.addSpacer();
    }
  });
  mainContainerStack.addSpacer();
  // value
  const rateValueStack = mainContainerStack.addStack();
  rateValueStack.layoutVertically();
  rateTypes.forEach((rateType, index) => {
    const valueStack = rateValueStack.addStack();
    valueStack.layoutHorizontally();
    valueStack.addSpacer();
    const rate = rates[rateType];
    const value = getCurrency(getRateValue(rate[1]), false);
    const rateTitleElement = valueStack.addText(value);
    rateTitleElement.textColor = getForegroundColor();
    rateTitleElement.font = Font.semiboldSystemFont(12);
    rateTitleElement.lineLimit = 1;
    if (index < rateTypes.length - 1) {
      rateValueStack.addSpacer();
    }
  });
  mainContainerStack.addSpacer(8);
  // change
  const rateChangeStack = mainContainerStack.addStack();
  rateChangeStack.layoutVertically();
  rateTypes.forEach((rateType, index) => {
    const valueStack = rateChangeStack.addStack();
    valueStack.size = new Size(12, 12);
    valueStack.centerAlignContent();
    const rate = rates[rateType];
    const changeValue = rate[2];
    const changeSymbol = SFSymbol.named(
      changeValue === 0 ? 'equal' : changeValue > 0 ? 'arrow.up' : 'arrow.down'
    );
    const changeSymbolImage = valueStack.addImage(changeSymbol.image);
    changeSymbolImage.tintColor = getChangeColor(changeValue);
    changeSymbolImage.imageSize = new Size(8, 8);
    // changeSymbolImage.borderWidth = 1;
    // changeSymbolImage.borderColor = Color.red();
    if (index < rateTypes.length - 1) {
      rateChangeStack.addSpacer();
    }
  });
  // refresh widget automatically
  // const nextRefresh = Date.now() + 1000;
  // widget.refreshAfterDate = new Date(nextRefresh);
  return widget;
};

const widget = await createVerticalWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();
