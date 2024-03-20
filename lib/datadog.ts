import { ApiObject } from 'cdk8s';
import { Construct } from 'constructs';

export interface BasicObservabilityBundleProps {
  serviceName: string
  friendlyServiceName?: string
}

type HydratedProps = {
  serviceName: string
  friendlyServiceName: string
}

export class BasicObservabilityBundle extends Construct {
  constructor(scope: Construct, ns: string, props: BasicObservabilityBundleProps) {
    super(scope, ns);

    const hydratedProps = this.hydrateProps(props);

    new ApiObject(scope, 'dashboard', {
      apiVersion: 'datadog.upbound.io/v1alpha1',
      kind: 'DashboardJSON',
      forProvider: {
        dashboard: JSON.stringify({
          title: `jackjack-cdk8s-demo Basic Observability Bundle Dashboard for ${hydratedProps.friendlyServiceName}`,
          widgets: []
        })
      },
      providerConfigRef: {
        name: 'datadog-provider-config'
      }
    })
  }

  hydrateProps(props: BasicObservabilityBundleProps): HydratedProps {
    return {
      serviceName: props.serviceName,
      friendlyServiceName: props.friendlyServiceName ?? props.serviceName.replace('-', ' ') // In real life we'd put this in title case
    }
  }
}

// class WidgetArrayBuilder {
//   constructor()
//   widgetDefs = []
// }

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