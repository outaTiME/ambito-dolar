import { ScrollView } from 'react-native';

import Helper from '@/utilities/Helper';

export default ({ children, ...props }) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  return (
    <ScrollView indicatorStyle={indicatorStyle} {...props}>
      {children}
    </ScrollView>
  );
};
