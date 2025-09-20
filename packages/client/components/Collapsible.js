import { Component } from 'react';
import { Animated, Easing } from 'react-native';

const ANIMATED_EASING_PREFIXES = ['easeInOut', 'easeOut', 'easeIn'];

export default class Collapsible extends Component {
  static defaultProps = {
    align: 'top',
    collapsed: true,
    collapsedHeight: 0,
    enablePointerEvents: false,
    duration: 300,
    easing: 'easeOutCubic',
    onAnimationEnd: () => null,
    renderChildrenCollapsed: true,
  };

  constructor(props) {
    super(props);
    this.state = {
      measuring: false,
      measured: false,
      height: new Animated.Value(
        Number.isFinite(props.collapsedHeight) ? props.collapsedHeight : 0,
      ),
      contentHeight: 0,
      animating: false,
    };
    this._animating = false;
    this._animation = null;
    this.unmounted = false;
  }

  componentDidMount() {
    if (!this.props.collapsed) {
      this._measureContent((h) => {
        this.state.height.setValue(Number.isFinite(h) ? h : 0);
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.collapsed !== this.props.collapsed) {
      this._toggleCollapsed(this.props.collapsed);
    } else if (
      this.props.collapsed &&
      prevProps.collapsedHeight !== this.props.collapsedHeight
    ) {
      const safe = Number.isFinite(this.props.collapsedHeight)
        ? this.props.collapsedHeight
        : 0;
      this.state.height.setValue(safe);
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
    if (this._animation) this._animation.stop();
  }

  contentHandle = null;

  _handleRef = (ref) => {
    this.contentHandle = ref;
  };

  _measureContent(callback) {
    this.setState({ measuring: true }, () => {
      requestAnimationFrame(() => {
        if (!this.contentHandle) {
          this.setState({ measuring: false }, () =>
            callback(this.props.collapsedHeight || 0),
          );
          return;
        }
        const ref =
          typeof this.contentHandle.measure === 'function'
            ? this.contentHandle
            : this.contentHandle.getNode?.();
        if (!ref || typeof ref.measure !== 'function') {
          this.setState({ measuring: false }, () =>
            callback(this.props.collapsedHeight || 0),
          );
          return;
        }
        ref.measure((_x, _y, _w, h) => {
          const safeH = Number.isFinite(h)
            ? h
            : this.props.collapsedHeight || 0;
          this.setState(
            { measuring: false, measured: true, contentHeight: safeH },
            () => callback(safeH),
          );
        });
      });
    });
  }

  _toggleCollapsed(collapsed) {
    if (collapsed) {
      this._transitionToHeight(this.props.collapsedHeight);
    } else {
      if (this.contentHandle) {
        this._measureContent((contentHeight) => {
          this._transitionToHeight(contentHeight);
        });
      } else if (this.state.measured) {
        this._transitionToHeight(this.state.contentHeight);
      } else {
        this._transitionToHeight(0);
      }
    }
  }

  _transitionToHeight(height) {
    const { duration } = this.props;
    let easing = this.props.easing;
    if (typeof easing === 'string') {
      let found = false;
      for (let i = 0; i < ANIMATED_EASING_PREFIXES.length; i++) {
        const prefix = ANIMATED_EASING_PREFIXES[i];
        if (easing.substr(0, prefix.length) === prefix) {
          let func = easing.substr(prefix.length);
          func = func
            ? func.substr(0, 1).toLowerCase() + func.substr(1)
            : 'ease';
          const base = Easing[func] || Easing.ease;
          const dir =
            Easing[prefix.substr(4, 1).toLowerCase() + prefix.substr(5)];
          easing = typeof dir === 'function' ? dir(base) : Easing.ease;
          found = true;
          break;
        }
      }
      if (!found) easing = Easing[easing] || Easing.ease;
    }
    if (typeof easing !== 'function') easing = Easing.ease;

    if (this._animation) this._animation.stop();

    const target = Number.isFinite(height)
      ? height
      : this.props.collapsedHeight || 0;

    this._animating = true;
    this._animation = Animated.timing(this.state.height, {
      useNativeDriver: false,
      toValue: target,
      duration,
      easing,
    });
    this._animation.start(() => {
      this._animating = false;
      if (!this.unmounted) this.props.onAnimationEnd();
    });
  }

  _handleLayoutChange = (event) => {
    const contentHeight = event?.nativeEvent?.layout?.height ?? 0;
    if (
      this._animating ||
      this.props.collapsed ||
      this.state.measuring ||
      !Number.isFinite(contentHeight) ||
      this.state.contentHeight === contentHeight
    ) {
      return;
    }
    this.state.height.setValue(contentHeight);
    this.setState({ contentHeight });
  };

  render() {
    const { collapsed, enablePointerEvents, renderChildrenCollapsed } =
      this.props;
    const { height, contentHeight, measuring, measured } = this.state;

    const hasKnownHeight = !measuring && (measured || collapsed);
    const style = {
      overflow: 'hidden',
      height: hasKnownHeight ? height : 0,
    };

    const contentStyle = {};
    if (measuring) {
      contentStyle.position = 'absolute';
      contentStyle.opacity = 0;
    } else if (this.props.align === 'center') {
      contentStyle.transform = [
        {
          translateY: height.interpolate({
            inputRange: [0, contentHeight],
            outputRange: [contentHeight / -2, 0],
          }),
        },
      ];
    } else if (this.props.align === 'bottom') {
      contentStyle.transform = [
        {
          translateY: height.interpolate({
            inputRange: [0, contentHeight],
            outputRange: [-contentHeight, 0],
          }),
        },
      ];
    }
    if (this._animating) {
      contentStyle.height = contentHeight;
    }

    const shouldRenderChildren =
      renderChildrenCollapsed ||
      ((!collapsed || (collapsed && this._animating)) &&
        (this._animating || measuring || measured));

    return (
      <Animated.View
        style={style}
        pointerEvents={!enablePointerEvents && collapsed ? 'none' : 'auto'}
      >
        <Animated.View
          ref={this._handleRef}
          style={[this.props.style, contentStyle]}
          onLayout={this._animating ? undefined : this._handleLayoutChange}
        >
          {shouldRenderChildren && this.props.children}
        </Animated.View>
      </Animated.View>
    );
  }
}
