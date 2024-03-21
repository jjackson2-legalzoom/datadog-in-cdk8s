import { ApiObject } from 'cdk8s';
import { Construct } from 'constructs';

export interface BasicObservabilityBundleProps {
  serviceName: string
  friendlyServiceName?: string,
  warningThreshold: number,
  targetThreshold: number
}

type HydratedProps = {
  serviceName: string
  friendlyServiceName: string,
  warningThreshold: number,
  targetThreshold: number
}

export class BasicObservabilityBundle extends Construct {
  constructor(scope: Construct, ns: string, props: BasicObservabilityBundleProps) {
    super(scope, ns);

    const hydratedProps = this.hydrateProps(props);

    let widgetArrayBuilder = new WidgetArrayBuilder();

    widgetArrayBuilder.add({
      definition: buildWidgetDef({
        title: 'Success Rate',
        requests: [
          buildWidgetRequest({
            formulas: [{
              formula: '100 * (query1 - query2) / query1'
            }],
            queries: [
              {
                data_source: 'metrics',
                name: 'query1',
                query: buildHitByStatusString(props.serviceName, [['env', 'p']])
              },
              {
                data_source: 'metrics',
                name: 'query2',
                query: buildHitByStatusString(props.serviceName, [['env', 'p'], ['http.status_code', '400']])
              }
            ]
          })
        ],
        markers: [
          {
            value: `${props.warningThreshold} < y < 100`,
            display_type: 'ok dashed'
          },
          {
            value: `${props.targetThreshold} < y < ${props.warningThreshold}`,
            display_type: 'warning dashed'
          },
          {
            value: `0 < y < ${props.targetThreshold}`,
            display_type: 'error dashed'
          }
        ]
      }),
      width: 4,
      height: 2
    })

    widgetArrayBuilder.add({
      definition: buildWidgetDef({
        title: 'Traffic',
        requests: [
          buildWidgetRequest({
            queries: [
              {
                data_source: 'metrics',
                name: 'query1',
                query: buildHitByStatusString(props.serviceName, [['env', 'p']])
              }
            ]
          })
        ],
      }),
      width: 4,
      height: 2
    })

    new ApiObject(scope, 'dashboard', {
      apiVersion: 'datadog.upbound.io/v1alpha1',
      kind: 'DashboardJSON',
      spec: {
        forProvider: {
          dashboard: JSON.stringify({
            title: `jackjack-cdk8s-demo Basic Observability Bundle Dashboard for ${hydratedProps.friendlyServiceName}`,
            widgets: widgetArrayBuilder.build(),
            template_variables: [],
            layout_type: "ordered",
            notify_list: [],
            reflow_type: "fixed"
          })
        },
        providerConfigRef: {
          name: 'datadog-provider-config'
        }
      }
    })
  }

  hydrateProps(props: BasicObservabilityBundleProps): HydratedProps {
    return {
      serviceName: props.serviceName,
      friendlyServiceName: props.friendlyServiceName ?? props.serviceName.replace('-', ' '), // In real life we'd put this in title case
      warningThreshold: props.warningThreshold,
      targetThreshold: props.targetThreshold
    }
  }
}

function buildHitByStatusString(serviceName: string, filters: [string, string][]): string {
  // TODO - default to `env:p` unless overridden
  filters.push(['service', serviceName])
  return `sum:trace.opentelemetry.server.hits.by_http_status{${filters.map((filter) => filter[0] + ':' + filter[1]).join(', ')}}.as_count()`
}

/***************
 * Widgets
 ****************/ 
interface Widget {
  definition: WidgetDef,
  layout: WidgetLayout
}

interface WidgetProps {
  definition: WidgetDef,
  width: number,
  height: number
}

class WidgetArrayBuilder {
  // Currently only supports purely linear layouts for this proof-of-concept
   
  widgetPropses: WidgetProps[];

  constructor(){
    this.widgetPropses = [];
  }

  public add(props: WidgetProps) {
    this.widgetPropses.push(props);
  }

  public build(): Widget[] {
    var x = 0;
    let output: Widget[] = [];
    for (let props of this.widgetPropses) {
      output.push({
        definition: props.definition,
        layout: {
          x: x,
          y: 0,
          width: props.width,
          height: props.height
        }
      })
      x += props.width;
    }
    return output
  }
}

interface WidgetLayout {
  x: number,
  y: number
  width: number
  height: number
}


/***************
 * Widget Definitions
 ****************/ 

interface WidgetDef {
  title: string,
  title_size: string, // Actually, "a number as a string"
  title_align: 'left' | 'right',
  show_legend: boolean,
  legend_layout: 'auto',
  legend_columns?: LegendColumn[]
  time: {},
  type: 'timeseries',
  requests: WidgetRequest[],
  markers: WidgetMarker[]
}

interface WidgetDefProps {
  title: string,
  title_size?: number,
  title_align?: 'left' | 'right'
  show_legend?: boolean,
  legend_layout?: 'auto' // TBD - what other values are legal?
  legend_columns?: LegendColumn[],
  // No "time" as I don't know what that's supposed to contain
  type?: 'timeseries',
  requests: WidgetRequest[],
  markers?: WidgetMarker[]
}

function buildWidgetDef(props: WidgetDefProps): WidgetDef {
  return {
    title: props.title,
    title_size: (props.title_size ?? 16).toString(),
    title_align: props.title_align ?? 'left',
    show_legend: props.show_legend ?? true,
    legend_layout: props.legend_layout ?? 'auto',
    legend_columns: props.legend_columns ?? ['avg', 'min', 'max', 'value', 'sum'],
    time: {},
    type: props.type ?? 'timeseries',
    requests: props.requests,
    markers: props.markers ?? []
  }
}

type LegendColumn = 'avg' | 'min' | 'max' | 'value' | 'sum'

/***************
 * Widget Request
 ****************/ 

interface WidgetRequest {
  formulas: WidgetFormula[],
  queries: WidgetQuery[],
  response_format: 'timeseries'
  style: WidgetRequestStyle,
  display_type?: 'line'
}

interface WidgetRequestProps {
  formulas?: WidgetFormula[],
  queries: WidgetQuery[],
  response_format?: 'timeseries',
  style?: WidgetRequestStyle,
  display_type?: 'line'
}

function buildWidgetRequest(props: WidgetRequestProps): WidgetRequest {
  return {
    formulas: props.formulas ?? [],
    queries: props.queries,
    response_format: props.response_format ?? 'timeseries',
    style: props.style ?? {
      palette: 'dog_classic',
      line_type: 'solid',
      line_width: 'normal'
    },
    display_type: props.display_type ?? 'line'
  }
}

interface WidgetFormula {
  formula: string
}

interface WidgetQuery {
  data_source: 'metrics',
  name: string,
  query: String
}

interface WidgetRequestStyle {
  palette: 'dog_classic',
  line_type: 'solid',
  line_width: 'normal'
}

interface WidgetMarker {
  value: string,
  display_type: string // Could make a type to encode that this is `{ok/warning/error} {dashed/??}`
}



/**
 * kind: DashboardJSON
  metadata:
    annotations:
      gotemplating.fn.crossplane.io/composition-resource-name: dashboard
  spec:
    forProvider:
      dashboard: |
        {
          "title": "jackjack-demo Basic Observability Bundle Dashboard for {{ .observed.composite.resource.spec.serviceName }}",
          "description": "",
          "widgets": [
            {
              "id": 4531676455232922,
              "definition": {
                "title": "Success Rate",
                "title_size": "16",
                "title_align": "left",
                "show_legend": true,
                "legend_layout": "auto",
                "legend_columns": [
                  "avg",
                  "min",
                  "max",
                  "value",
                  "sum"
                ],
                "time": {},
                "type": "timeseries",
                "requests": [
                  {
                    "formulas": [
                      {
                        "formula": "100 * (query1 - query2) / query1"
                      }
                    ],
                    "queries": [
                      {
                        "data_source": "metrics",
                        "name": "query1",
                        "query": "sum:trace.opentelemetry.server.hits.by_http_status{env:p, service:{{ .observed.composite.resource.spec.serviceName }}}.as_count()"
                      },
                      {
                        "data_source": "metrics",
                        "name": "query2",
                        "query": "sum:trace.opentelemetry.server.hits.by_http_status{env:p, service:{{ .observed.composite.resource.spec.serviceName }}, http.status_code:400}.as_count()"
                      }
                    ],
                    "response_format": "timeseries",
                    "style": {
                      "palette": "dog_classic",
                      "line_type": "solid",
                      "line_width": "normal"
                    },
                    "display_type": "line"
                  }
                ],
                "markers": [
                  {
                    "value": "{{ .observed.composite.resource.spec.warningThreshold }} < y < 100",
                    "display_type": "ok dashed"
                  },
                  {
                    "value": "{{ .observed.composite.resource.spec.targetThreshold }} < y < {{ .observed.composite.resource.spec.warningThreshold }}",
                    "display_type": "warning dashed"
                  },
                  {
                    "value": "0 < y < {{ .observed.composite.resource.spec.targetThreshold }}",
                    "display_type": "error dashed"
                  }
                ]
              },
              "layout": {
                "x": 0,
                "y": 0,
                "width": 4,
                "height": 2
              }
            },
            {
              "id": 4531676455232923,
              "definition": {
                "title": "Traffic",
                "title_size": "16",
                "title_align": "left",
                "show_legend": true,
                "legend_layout": "auto",
                "legend_columns": [
                  "avg",
                  "min",
                  "max",
                  "value",
                  "sum"
                ],
                "time": {},
                "type": "timeseries",
                "requests": [
                  {
                    "queries": [
                      {
                        "data_source": "metrics",
                        "name": "query1",
                        "query": "sum:trace.opentelemetry.server.hits.by_http_status{env:p, service:{{ .observed.composite.resource.spec.serviceName }}}.as_count()"
                      }
                    ],
                    "response_format": "timeseries",
                    "style": {
                      "palette": "dog_classic",
                      "line_type": "solid",
                      "line_width": "normal"
                    },
                    "display_type": "line"
                  }
                ]
              },
              "layout": {
                "x": 4,
                "y": 0,
                "width": 4,
                "height": 2
              }
            }
          ],
          "template_variables": [],
          "layout_type": "ordered",
          "notify_list": [],
          "reflow_type": "fixed"
        }

    providerConfigRef:
      name: datadog-provider-config
  ---
  apiVersion: datadog.upbound.io/v1alpha1
  kind: ServiceLevelObjective
  metadata:
    name: "jackjack-slo-for-{{ .observed.composite.resource.spec.serviceName }}"
    annotations:
      gotemplating.fn.crossplane.io/composition-resource-name: slo
  spec:
    forProvider:
      name: "jackjack-slo-for-{{ .observed.composite.resource.spec.serviceName }}"
      thresholds:
        - timeframe: 30d
          target: {{ .observed.composite.resource.spec.targetThreshold }}
          warning: {{ .observed.composite.resource.spec.warningThreshold }}
      type: "metric"
      description: "A basic SLO"
      timeframe: "30d"
      targetThreshold: {{ .observed.composite.resource.spec.targetThreshold }}
      warningThreshold: {{ .observed.composite.resource.spec.warningThreshold }}
      query:
        - denominator: "sum:trace.opentelemetry.server.hits.by_http_status{env:p,service:{{ .observed.composite.resource.spec.serviceName }}}.as_count()"
          numerator: "sum:trace.opentelemetry.server.hits.by_http_status{env:p,service:{{ .observed.composite.resource.spec.serviceName }}}.as_count() - sum:trace.opentelemetry.server.hits.by_http_status{env:p,service:{{ .observed.composite.resource.spec.serviceName }},http.status_code:400}.as_count()"
    providerConfigRef:
        name: datadog-provider-config
  ---
  apiVersion: datadog.upbound.io/v1alpha1
  kind: Monitor
  metadata:
    name: jackjack-basic-monitor-for-{{ .observed.composite.resource.spec.serviceName }}
    annotations:
      gotemplating.fn.crossplane.io/composition-resource-name: monitor
  spec:
    forProvider:
      name: jackjack-basic-monitor-for-{{ .observed.composite.resource.spec.serviceName }}
      query: "sum(last_4h):anomalies(trace.opentelemetry.server.hits.by_http_status{env:p,service:{{ .observed.composite.resource.spec.serviceName }}}.as_count(), 'agile', 3, direction='both', interval=60, alert_window='last_5m', timezone='America/Los_Angeles', count_default_zero='true', seasonality='weekly') >= 1"
      type: "query alert"
      message: "@pagerduty-fake_name_to_not_page_anyone"
      tags:
        - "sre"
      priority: 5
      evaluationDelay: 60
      includeTags: true
      notifyNoData: true
      noDataTimeframe: 300
      renotifyInterval: 0
      monitorThresholdWindows:
        - recoveryWindow: last_5m
          triggerWindow: last_5m
      monitorThresholds:
        - critical: "1"
          criticalRecovery: "0"
 */