import AmbitoDolar from '@ambito-dolar/core';
import _ from 'lodash';

// the persisted customization over the payload, the excluded types dropped and the rest ordered
export const getSortedRates = (
  rates,
  order,
  orderDirection,
  excludedRates,
  rateTypes,
) => {
  if (rates) {
    // defaults
    order ??= 'default';
    orderDirection ??= 'asc';
    rateTypes ??= Object.keys(rates);
    let chain = _.chain(rates).omit(excludedRates).toPairs();
    if (order === 'default' && orderDirection === 'desc') {
      chain = chain.reverse();
    } else if (order === 'name') {
      chain = chain.orderBy(([type]) => {
        const title = AmbitoDolar.getRateTitle(type);
        return title;
      }, orderDirection);
    } else if (order === 'price') {
      chain = chain.orderBy(([, { stats }]) => {
        const stat = _.last(stats);
        const value = AmbitoDolar.getRateValue(stat);
        return value;
      }, orderDirection);
    } else if (order === 'change') {
      chain = chain.orderBy(([, { stats }]) => {
        const stat = _.last(stats);
        const change = stat[2];
        return change;
      }, orderDirection);
    } else if (order === 'update') {
      chain = chain.orderBy(([, { stats }]) => {
        const stat = _.last(stats);
        const timestamp = stat[0];
        return timestamp;
      }, orderDirection);
    } else if (order === 'custom') {
      chain = chain.orderBy(([type]) => {
        // when not rateTypes leave to last (usually when a new rate is added)
        const index =
          rateTypes.indexOf(type) > -1
            ? rateTypes.indexOf(type)
            : rateTypes.length;
        return index;
      }, orderDirection);
    }
    return chain.fromPairs().value();
  }
};
