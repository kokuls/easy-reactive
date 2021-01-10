import React from 'react';
import * as d3 from 'd3';
import { Rect } from '../components/Rect';
import { Operator } from '../components/Operator';
import { Subject, zip } from 'rxjs';
import { Stream } from '../components/Stream';
import { Queue } from '../components/Queue';
import { Layout } from '../components/Layout';
import { Output } from '../components/Output';
import { Markdown } from '../components/Markdown';

const DOC = `
Zip is like one assembly station, one patty and one bread must both be ready to go
~~~js
zip(a$, b$).subscribe(([a, b]) => {
  console.log(a, b)
});
~~~
`;

export default class ZipDemo extends React.Component {
  constructor(props) {
    super(props);
    this.zipQueue = [];
    this.isPullingFromZip = false;
    this.a$ = new Subject();
    this.b$ = new Subject();
    this.state = {
      tickA: [],
      tickB: [],
      queueA: [],
      queueB: [],
      outputA: undefined,
      outputB: undefined,
      queueUpdateMode: undefined,
    };
    this.setUpOperator();
  }

  setUpOperator = () => {
    this.sub = zip(this.a$, this.b$).subscribe(([a, b]) => {
      this.zipQueue.push([a, b]);
      this.pullFromZip();
    });
  };

  pullFromZip = () => {
    if (!this.isPullingFromZip && this.zipQueue.length > 0) {
      this.isPullingFromZip = true;
      const [a, b] = this.zipQueue.shift();
      setTimeout(() => {
        const selectionA = d3.select('.queueA g');
        const selectionB = d3.select('.queueB g');
        [selectionA, selectionB].forEach((selection, index) => {
          selection
            .select('rect')
            .style('fill', '#fae560')
            .transition()
            .delay(500)
            .on('end', () => {
              selection
                .transition()
                .ease(d3.easeLinear)
                .duration(500)
                .style('transform', 'translateY(80px)')
                .on('end', () => {
                  if (index === 0) {
                    this.setState(
                      (prevState) => {
                        return {
                          queueA: prevState.queueA.filter(
                            (d) => d.key !== a.key
                          ),
                          queueB: prevState.queueB.filter(
                            (d) => d.key !== b.key
                          ),
                          queueUpdateMode: undefined,
                          outputA: a,
                          outputB: b,
                        };
                      },
                      () => {
                        this.isPullingFromZip = false;
                        this.pullFromZip();
                      }
                    );
                  }
                });
            });
        });
      });
    }
  };

  emitA = () => {
    this.emit('a');
  };

  emitB = () => {
    this.emit('b');
  };

  emit = (label) => {
    const name = `tick${label.toUpperCase()}`;
    this.setState((prevState) => {
      const lastTick = prevState[name][prevState[name].length - 1];
      const lastKey = lastTick ? lastTick.key : -1;
      const key = lastKey + 1;
      return {
        [name]: prevState[name].concat({
          key,
          text: `${label}${key}`,
        }),
      };
    });
  };

  onAEmit = (d) => {
    this.setState(
      (prevState) => {
        return {
          queueA: prevState.queueA.concat(d),
          queueUpdateMode: 'enter',
        };
      },
      () => {
        this.a$.next(d);
      }
    );
  };

  onBEmit = (d) => {
    this.setState(
      (prevState) => {
        return {
          queueB: prevState.queueB.concat(d),
          queueUpdateMode: 'enter',
        };
      },
      () => {
        this.b$.next(d);
      }
    );
  };

  reset = () => {
    this.zipQueue = [];
    // cancel all running transitions
    d3.select('.animation').selectAll('*').interrupt();
    this.isPullingFromZip = false;
    this.setState({
      tickA: [],
      tickB: [],
      queueA: [],
      queueB: [],
      outputA: undefined,
      outputB: undefined,
    });
    if (this.sub) {
      this.sub.unsubscribe();
      this.setUpOperator();
    }
  };

  render() {
    const {
      tickA,
      tickB,
      queueA,
      queueB,
      queueUpdateMode,
      outputA,
      outputB,
    } = this.state;
    return (
      <Layout title="zip">
        <main>
          <h1>Zip</h1>
          <div className="demo">
            <svg className="animation">
              <g transform="translate(150, 100)">
                <Stream
                  data={tickA}
                  x={0}
                  y={0}
                  width={200}
                  height={20}
                  onEmit={this.onAEmit}
                  key="a"
                />
                <Stream
                  data={tickB}
                  x={0}
                  y={30}
                  width={200}
                  height={20}
                  onEmit={this.onBEmit}
                  key="b"
                />
                <g transform="translate(200, -20)">
                  <Operator width={90} height={90} tooltip="zip" />
                  <Queue
                    className="queueA"
                    data={queueA}
                    x={10}
                    y={20}
                    mode={queueUpdateMode}
                    key="a"
                  />
                  <Queue
                    className="queueB"
                    data={queueB}
                    x={10}
                    y={50}
                    mode={queueUpdateMode}
                    key="b"
                  />
                </g>
              </g>
            </svg>
            <div className="output-container">
              <Output width={100} height={50}>
                {outputA && outputB ? (
                  <span>[{`${outputA.text}, ${outputB.text}`}]</span>
                ) : (
                    'Empty'
                  )}
              </Output>
            </div>
          </div>
          <div>
            <button onClick={this.emitA}>Emit A</button>
            <button onClick={this.emitB}>Emit B</button>
            <button onClick={this.reset}>Reset</button>
          </div>
          <Markdown source={DOC} />
        </main>
        <style jsx>{`
          .output-container {
            position: absolute;
            top: 0;
            left: 500px;
          }
        `}</style>
      </Layout>
    );
  }
}
