import { Construct } from 'constructs';
import { App, Chart, ChartProps } from 'cdk8s';
import { BasicObservabilityBundle } from './lib/datadog';

export class BasicObservabilityBundleDemoChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = { }) {
    super(scope, id, props);

    new BasicObservabilityBundle(this, 'basic-observability-bundle', {
      serviceName: 'cartservice',
      warningThreshold: 99,
      targetThreshold: 90
    })

  }
}

const app = new App();
new BasicObservabilityBundleDemoChart(app, 'datadog-in-cdk8s');
app.synth();
