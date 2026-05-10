import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 40, backgroundColor: '#fff', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: 'red', fontWeight: 'bold' }}>App Crashed!</Text>
          <ScrollView style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</Text>
            <Text style={{ marginTop: 10, fontFamily: 'monospace' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
