import { Component, OnInit, ViewChildren, QueryList, ElementRef, HostListener } from '@angular/core';
import { AuthService } from '../../../service/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { CalculateForm } from '../../../form/CalculateForm';
import { ChartService } from '../../../service/chart.service';
import { MsgDialogComponent } from '../../../utility/msg-dialog/msg-dialog.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

declare var Plotly: any;

@Component({
  selector: 'app-signal-dl-throughput',
  templateUrl: './signal-dl-throughput.component.html',
  styleUrls: ['./signal-dl-throughput.component.scss']
})
export class SignalDlThroughputComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private translateService: TranslateService,
    private chartService: ChartService,
    private matDialog: MatDialog,
    ) { }

  /** 結果form */
  calculateForm = new CalculateForm();
  /** 結果data */
  result = {};
  /** 障礙物list */
  rectList = [];
  /** BS顯示 */
  showBs = 'visible';
  /** AP list */
  candidateList = [];
  /** 現有基站 list */
  defaultBsList = [];
  /** 外框style */
  style = {};
  /** 高度 */
  zValue = '';
  /** 圖id */
  chartId;
  /** show UE */
  showUE = true;
  /** 圖區style */
  divStyle = {
    position: 'relative',
    opacity: 0
  };
  /** 障礙物顯示 */
  showObstacle = 'visible';
  /** AP顯示 */
  showCandidate = true;
  /** slide */
  opacityValue: number = 0.8;
  /** Max */
  maxZ = [];
  /** Min */
  minZ = [];
  /** AP */
  shapes = [];
  /** AP文字 */
  annotations = [];
  /** 顯示圖轉換的image */
  showImg = false;
  /** 圖轉換的image src */
  imageSRC = '';
  /** 障礙物element */
  @ViewChildren('obstacleElm') obstacleElm: QueryList<ElementRef>;
  msgDialogConfig: MatDialogConfig = new MatDialogConfig();


  @HostListener('window:resize') windowResize() {
    Plotly.relayout(this.chartId, {
      autosize: true
    }).then(gd => {

      const sizes = this.chartService.calSize(this.calculateForm, gd);
      const layoutOption = {
        width: sizes[0],
        height: sizes[1]
      };
      Plotly.relayout(this.chartId, layoutOption);
    });
  }

  ngOnInit(): void {
  }

  financial(x) {
    return Number.parseFloat(x).toFixed(1);
  }

  /**
   * 畫圖
   * @param isPDF 
   * @param zValue 
   */
  draw(isPDF, zValue) {
    zValue = Number(zValue);
    this.zValue = zValue;
    const images = [];
    if (!this.authService.isEmpty(this.calculateForm.mapImage)) {
      const reader = new FileReader();
      reader.readAsDataURL(this.authService.dataURLtoBlob(this.calculateForm.mapImage));
      reader.onload = (e) => {

        images.push({
          source: reader.result,
          x: 0,
          y: 0,
          sizex: this.calculateForm.width,
          sizey: this.calculateForm.height,
          xref: 'x',
          yref: 'y',
          xanchor: 'left',
          yanchor: 'bottom',
          sizing: 'stretch',
          layer: 'below'
        });

        this.drawChart(isPDF, images);
      };
    } else {
      this.drawChart(isPDF, images);
    }
  }

  /**
   * 畫圖
   * @param isPDF 
   * @param images 
   */
  drawChart(isPDF, images) {
    // draw background image chart
    const defaultPlotlyConfiguration = {
      displaylogo: false,
      showTips: false,
      editable: false,
      scrollZoom: false,
      displayModeBar: false
    };

    this.rectList.length = 0;
    this.defaultBsList.length = 0;
    this.candidateList.length = 0;

    const layout = {
      autosize: true,
      xaxis: {
        linewidth: 1,
        mirror: 'all',
        range: [0, this.calculateForm.width],
        showgrid: false,
        zeroline: false,
        // fixedrange: true,
        ticks: 'inside',
        ticksuffix: 'm'
      },
      yaxis: {
        linewidth: 1,
        mirror: 'all',
        range: [0, this.calculateForm.height],
        showgrid: false,
        zeroline: false,
        // fixedrange: false,
        ticks: 'inside',
        ticksuffix: 'm'
      },
      margin: { t: 20, b: 20, l: 40, r: 5},
      images: images,
      hovermode: 'closest',
      shapes: [],
      annotations: []
    };

    const zValues = JSON.parse(this.calculateForm.zValue);

    let id;
    if (isPDF) {
      id = document.querySelector('#pdf_area').querySelectorAll(`.dlThroughputMap_chart`)[zValues.indexOf(this.zValue)];
    } else {
      id = document.querySelectorAll(`.dlThroughputMap_chart`)[0];
    }
    this.chartId = id;

    const zLen = zValues.length;
    const zData = [];
    const allZ = [];
    const zText = [];
    for (let i = 0; i < zLen; i++) {
      zData.push([]);
      allZ.push([]);
      zText.push([]);
    }
    let xIndex = 0;
    for (let i = 0;i < this.result['throughputMap'][0][0].length;i++) {
      this.maxZ.push(this.result['throughputMap'][0][0][i]);
      this.minZ.push(this.result['throughputMap'][0][0][i]);
    }
    // this.maxZ = Number(this.result['throughputMap'][0][0]);
    // this.minZ = Number(this.result['throughputMap'][0][0]);
    const mapX = [];
    const mapY = [];
    const mapText = [];
    for (const item of this.result['throughputMap']) {
      for (let i = 0; i < zLen; i++) {
        let yIndex = 0;
        for (const yData of item) {
          if (typeof zData[i][yIndex] === 'undefined') {
            zData[i][yIndex] = [];
            zText[i][yIndex] = [];
          }
          zData[i][yIndex][xIndex] = yData[i];
          //抓最大最小
          if (Number(zData[i][yIndex][xIndex]) > this.maxZ[i]) {
            this.maxZ[i] = Number(zData[i][yIndex][xIndex]);
            // console.log('歐拉歐拉歐拉歐拉歐拉歐拉歐拉'+this.maxZ[i]);
          }
          if (Number(zData[i][yIndex][xIndex]) < this.minZ[i]) {
            this.minZ[i] = Number(zData[i][yIndex][xIndex]);
            // console.log('無馱無馱無馱無馱無馱無馱無馱'+this.minZ[i]);
          }
          if (yData[i] == null) {
            // console.log(`x:${xIndex}, y:${yIndex}, z:${i}, ${yData[i]}`);
            // console.log(item);
          }
          zText[i][yIndex][xIndex] = Math.round(yData[i] * 100) / 100;

          mapX.push(xIndex);
          mapY.push(yIndex);
          mapText.push(zText[i][yIndex][xIndex]);

          yIndex++;
          allZ[i].push(yData[i]);
        }
      }
      xIndex++;
    }

    // 取z的最大值
    const zMax = [];
    const zMin = [];
    for (const item of allZ) {
      zMax.push(Plotly.d3.max(item));
      zMin.push(Plotly.d3.min(item));
    }

    const x = [];
    const y = [];
    const wRatio = this.calculateForm.width / this.result['throughputMap'].length;
    let xval = 0;
    const xLen = this.result['throughputMap'].length;
    for (let i = 0; i <= xLen; i++) {
      x.push(xval);
      xval += wRatio;
    }
    const hRatio = this.calculateForm.height / this.result['throughputMap'][0].length;
    let yval = 0;
    const yLen = this.result['throughputMap'][0].length;
    for (let i = 0; i <= yLen; i++) {
      y.push(yval);
      yval += hRatio;
    }
    const traces = [];
    // UE
    if (this.calculateForm.ueCoordinate !== '') {
      const list = this.calculateForm.ueCoordinate.split('|');
      const cx = [];
      const cy = [];
      const text = [];

      for (const item of list) {
        const oData = JSON.parse(item);
        if (oData[2] !== this.zValue) {
          continue;
        }
        cx.push(oData[0]);
        cy.push(oData[1]);
        text.push(`${this.translateService.instant('ue')}<br>X: ${oData[0]}<br>Y: ${oData[1]}<br>${this.translateService.instant('altitude')}: ${oData[2]}`);
      }

      traces.push({
        x: cx,
        y: cy,
        text: text,
        marker: {
          color: '#140101',
        },
        type: 'scatter',
        mode: 'markers',
        hoverinfo: 'none',
        showlegend: false,
        visible: this.showUE
      });
    }

    const dlThroughputAry = [];
    try {
      this.result['throughputMap'].map(v => {
        v.map(m => {
          m.map(d => {
            dlThroughputAry.push(d);
          });
        });
      });
    } catch(e){
      console.log('No dlThorughput data, it may be an old record');
    }

    let scalemax = Number(this.financial(Plotly.d3.max(dlThroughputAry)));
    let scalemin = Number(this.financial(Plotly.d3.min(dlThroughputAry)));
    let unit = Number(this.financial((scalemax-scalemin)))/4;
    let scaleunit = [scalemax, scalemax-unit, scalemax-2*unit, scalemax-3*unit, scalemin];
    scaleunit = scaleunit.map(el => Number(this.financial(el)));
    let scaleunitText = scaleunit.map(el => `${el}Mbps`);

    const trace = {
      x: x,
      y: y,
      z: zData[zValues.indexOf(this.zValue)],
      text: zText[zValues.indexOf(this.zValue)],
      // colorscale: [
      //   [0, 'rgb(12,51,131)'],
      //   [0.2, 'rgb(10,136,186)'],
      //   [0.3, 'rgb(136, 224, 53)'],
      //   [0.4, 'rgb(242,211,56)'],
      //   [0.75, 'rgb(242,143,56)'],
      //   [1, 'rgb(217,30,30)'],
      // ],
      colorscale: 'Portland',
      type: 'heatmap',
      hovertemplate: `X: %{x}<br>Y: %{y}<br>${this.translateService.instant('throughput')}: %{text}Mbps<extra></extra>`,
      // showscale: false,
      opacity: this.opacityValue,
      zsmooth: 'fast',
      zmin: scalemin,
      zmax: scalemax,
      colorbar: {
        autotick: false,
        tickvals: scaleunit,
        // tickvals: [1200, 800, 500, 300, 200, 100, 0],
        ticksuffix: 'Mbps',
        // ticktext: [24, 16, 8, 0, -8],
        ticktext: scaleunitText,
        ticklabelposition: 'inside bottom'
        // tick1: 24,
        // dtick: 7
      }
    };
    traces.push(trace);

    // 現有基站
    if (this.calculateForm.defaultBs !== '') {
      const list = this.calculateForm.defaultBs.split('|');
      let num = 1;
      const cx = [];
      const cy = [];
      const ctext = [];
      for (const item of list) {
        const oData = JSON.parse(item);
        const xdata = oData[0];
        const ydata = oData[1];
        const zdata = oData[2];
        cx.push(xdata);
        cy.push(ydata);

        const text = `${this.translateService.instant('defaultBs')}
        X: ${xdata}
        Y: ${ydata}
        ${this.translateService.instant('altitude')}: ${zdata}`;
        ctext.push(text);
        this.defaultBsList.push({
          x: xdata,
          y: ydata,
          ap: `${this.translateService.instant('default')}${num}`,
          color: 'green',
          hover: text,
          style: {
            visibility: this.showBs,
            opacity: 0
          },
          circleStyle: {
            visibility: this.showBs
          }
        });
        num++;
      }
    }

    // 新增基站
    if (this.calculateForm.candidateBs !== '') {
      const list = this.calculateForm.candidateBs.split('|');
      const cx = [];
      const cy = [];
      const chosenCandidate = [];
      for (let i = 0; i < this.result['chosenCandidate'].length; i++) {
        chosenCandidate.push(this.result['chosenCandidate'][i].toString());
      }
      let num = 1;

      const candidateX = [];
      const candidateY = [];
      const candidateText = [];
      const hoverText = [];
      for (const item of list) {
        const oData = JSON.parse(item);
        if (chosenCandidate.includes(oData.toString())) {
          const xdata = oData[0];
          const ydata = oData[1];
          const zdata = oData[2];
          cx.push(xdata);
          cy.push(ydata);

          const text = `${this.translateService.instant('candidateBs')}
          X: ${xdata}
          Y: ${ydata}
          Z: ${zdata}
          ${this.translateService.instant('bsPower')}: ${this.result['candidateBsPower'][chosenCandidate.indexOf(oData.toString())]} dBm`;
          this.candidateList.push({
            x: xdata,
            y: ydata,
            color: '#f7176a',
            hover: text,
            num: num,
            ap: `${this.translateService.instant('candidate')}${num}`
          });

          candidateX.push(xdata);
          candidateY.push(ydata);
          candidateText.push(`Z: ${zdata}<br>${this.translateService.instant('bsPower')}: ${this.result['candidateBsPower'][chosenCandidate.indexOf(oData.toString())]} dBm`);
          hoverText.push(text);
        }
        num++;
      }

      traces.push({
        x: candidateX,
        y: candidateY,
        text: candidateText,
        textfont: {
          color: '#fff'
        },
        type: 'scatter',
        mode: 'markers',
        marker: {
          size: 25,
          color: '#000'
        },
        hovertemplate: `X: %{x}<br>Y: %{y}<br>%{text}<extra></extra>`,
        showlegend: false,
        visible: this.showCandidate,
        uid: `AP`,
        opacity: 0
      });
    }

    this.shapes.length = 0;

    // 障礙物
    if (this.calculateForm.obstacleInfo !== '') {
      const obstacle = this.calculateForm.obstacleInfo.split('|');
      for (const item of obstacle) {
        const oData = JSON.parse(item);
        const xdata = oData[0];
        const ydata = oData[1];
        const oColor = '#000000';
        // 0~3分別是矩型、三角形、圓形、梯形
        let shape = oData[7];
        let text = `${this.translateService.instant('planning.obstacleInfo')}
        X: ${xdata}
        Y: ${ydata}
        ${this.translateService.instant('width')}: ${oData[2]}
        ${this.translateService.instant('height')}: ${oData[3]}
        ${this.translateService.instant('altitude')}: ${oData[4]}
        `;

        if (typeof oData[6] !== 'undefined') {
          text += `${this.translateService.instant('material')}: ${this.authService.parseMaterial(oData[6])}`;
        }
        if (typeof oData[7] === 'undefined') {
          shape = '0';
        }

        this.rectList.push({
          x: xdata,
          y: ydata,
          width: oData[2],
          height: oData[3],
          rotate: oData[5],
          shape: shape,
          style: {
            left: 0,
            top: 0,
            width: oData[2],
            height: oData[3],
            // transform: `rotate(${oData[5]}deg)`,
            position: 'absolute',
            visibility: this.showObstacle,
            opacity: 0
          },
          svgStyle: {
            width: oData[2],
            height: oData[3],
            fill: oColor,
          },
          hover: text
        });

      }
    }

    Plotly.newPlot(id, {
      data: traces,
      layout: layout,
      config: defaultPlotlyConfiguration
    }).then((gd) => {
      
      const xy: SVGRectElement = gd.querySelector('.xy').querySelectorAll('rect')[0];
      const rect = xy.getBoundingClientRect();
      let layoutOption = {};
      
      this.annotations.length = 0;
      const xLinear = Plotly.d3.scale.linear()
        .domain([0, rect.width])
        .range([0, this.calculateForm.width]);

        const yLinear = Plotly.d3.scale.linear()
          .domain([0, rect.height])
          .range([0, this.calculateForm.height]);
      // 新增基站
      if (this.calculateForm.candidateBs !== '') {
        for (const item of this.candidateList) {
          
          this.shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'y',
            x0: item.x,
            y0: item.y,
            x1: item.x + Number(xLinear(50)),
            y1: item.y + Number(yLinear(18)),
            fillcolor: '#003060',
            visible: this.showCandidate
          });

          this.annotations.push({
            x: item.x + Number(xLinear(25)),
            y: item.y + Number(yLinear(9)),
            xref: 'x',
            yref: 'y',
            text: item.ap,
            showarrow: false,
            font: {
              color: '#fff',
              size: 10
            },
            visible: this.showCandidate
          });
        }
      }

      if (this.calculateForm.defaultBs !== '') {
        for (const item of this.defaultBsList) {
          this.shapes.push({
            type: 'circle',
            xref: 'x',
            yref: 'y',
            x0: item.x,
            y0: item.y,
            x1: item.x + Number(xLinear(50)),
            y1: item.y + Number(yLinear(18)),
            fillcolor: '#005959',
            bordercolor: '#005959',
            visible: this.showBs
          });

          this.annotations.push({
            x: item.x + Number(xLinear(25)),
            y: item.y + Number(yLinear(9)),
            xref: 'x',
            yref: 'y',
            text: item.ap,
            showarrow: false,
            font: {
              color: '#fff',
              size: 10
            },
            visible: this.showBs
          });
        }
      }

      // 場域尺寸計算
      const leftArea = <HTMLDivElement> document.querySelector('.leftArea');
      this.chartService.calResultSize(this.calculateForm, gd, leftArea.clientWidth - this.chartService.leftSpace).then(res => {
        layoutOption = {
          width: res[0],
          height: res[1],
          shapes: this.shapes,
          annotations: this.annotations
        };
        // resize layout
        if (images.length > 0) {
          const image = new Image();
          image.src = images[0].source;
          image.onload = () => {
            this.reLayout(id, layoutOption, isPDF);
          };
          
        } else {
          this.reLayout(id, layoutOption, isPDF);
        }
      });

    });

    id.on('plotly_relayout',
    (eventdata) => {
      // console.log(this.calculateForm);
      let x_start = eventdata['xaxis.range[0]'];
      let x_end = eventdata['xaxis.range[1]'];
      let y_start = eventdata['yaxis.range[0]'];
      let y_end = eventdata['yaxis.range[1]'];
      if ((x_start != undefined && x_end != undefined && y_start != undefined && y_end != undefined)) {
        if (x_start == 0 && y_start == 0 && x_end == Number(this.calculateForm.width) && y_end == Number(this.calculateForm.height)) {
          console.log('original field');
          return;
        }
        x_start = Math.ceil(x_start);
        x_end = Math.floor(x_end);
        y_start = Math.ceil(y_start);
        y_end = Math.floor(y_end);
        let x_range = x_end - x_start;
        let y_range = y_end - y_start;
        let area = x_range*y_range;
        let totolTpt = 0;
        console.log(`${x_start} ${x_end} ${y_start} ${y_end}`);
        // console.log(zData);
        for (let i = y_start;i <= y_end;i++) {
          for (let j = x_start;j <= x_end;j++) {
            // console.log(`${i} ${j} ${zData[0][i][j]}`);
            totolTpt += zData[zValues.indexOf(this.zValue)][i][j];
          }
        }
        this.msgDialogConfig.data = {
          // type: 'success',
          infoMessage: `<br/>子場域平均傳輸速率: ${this.financial(totolTpt/area)}<br/>
          子場域總傳輸速率: ${this.financial(totolTpt)}<br/>
            x軸範圍: ${x_start}m~${x_end}m <br/>
            y軸範圍: ${y_start}m~${y_end}m <br/>`
        };
        this.matDialog.open(MsgDialogComponent, this.msgDialogConfig);
      }
    });
  }

  /**
   * 畫好圖後重新計算比例尺
   * @param id 
   * @param layoutOption 
   * @param isPDF 
   */
  reLayout(id, layoutOption, isPDF) {
    Plotly.relayout(id, layoutOption).then((gd2) => {

      this.divStyle.opacity = 1;
      const xy2: SVGRectElement = gd2.querySelector('.xy').querySelectorAll('rect')[0];
      const rect2 = xy2.getBoundingClientRect();
      gd2.style.opacity = 0.85;
      gd2.querySelectorAll('.plotly')[0].style.opacity = 0.85;

      this.style = {
        left: `${xy2.getAttribute('x')}px`,
        top: `${xy2.getAttribute('y')}px`,
        width: `${rect2.width}px`,
        height: `${rect2.height}px`,
        position: 'absolute'
      };

      const pixelXLinear = Plotly.d3.scale.linear()
        .domain([0, this.calculateForm.width])
        .range([0, rect2.width]);

      const pixelYLinear = Plotly.d3.scale.linear()
        .domain([0, this.calculateForm.height])
        .range([0, rect2.height]);

      for (const item of this.rectList) {
        // 障礙物加粗，07/20 註解障礙物加粗，避免位置看似偏移
        let width = pixelXLinear(item.width);
        // if (width < 5) {
        //   width = 5;
        // }
        let height = pixelYLinear(item.height);
        // if (height < 5) {
        //   height = 5;
        // }

        const leftPosition = pixelXLinear(item.x);

        item['style'].top = `${rect2.height - height - pixelYLinear(item.y)}px`;
        item['style'].left = `${leftPosition}px`;
        item['style'].width = `${width}px`;
        item['style'].height = `${height}px`;
        item['svgStyle'].width = `${width}px`;
        item['svgStyle'].height = `${height}px`;
        if (item.shape === 1) {
          const points = `${width / 2},0 ${width}, ${height} 0, ${height}`;
          item['points'] = points;
          console.log(item);
        } else if (item.shape === 2) {
          item['ellipseStyle'] = {
            cx: width / 2,
            cy: width / 2,
            rx: width / 2,
            ry: width / 2
          };
        }

        // 延遲轉角度，讓位置正確
        window.setTimeout(() => {
          item['style']['transform'] = `rotate(${item.rotate}deg)`;
          item['style'].opacity = 1;
        }, 0);
      }

      for (const item of this.defaultBsList) {
        item['style'] = {
          left: `${pixelXLinear(item.x)}px`,
          bottom: `${pixelYLinear(item.y)}px`,
          position: 'absolute'
        };
        item['circleStyle'] = {
          left: `${pixelXLinear(item.x) + 15}px`,
          bottom: `${pixelYLinear(item.y) + 25}px`,
          position: 'absolute'
        };
      }
      // 新增基站
      const xy3: SVGRectElement = gd2.querySelector('.xy');
      const rect3 = xy3.getBoundingClientRect();
      const candisateXLinear = Plotly.d3.scale.linear()
        .domain([0, this.calculateForm.width])
        .range([0, rect3.width]);

      const candisateYLinear = Plotly.d3.scale.linear()
        .domain([0, this.calculateForm.height])
        .range([0, rect3.height]);
      for (const item of this.candidateList) {
        item['style'] = {
          left: `${pixelXLinear(item.x)}px`,
          bottom: `${candisateYLinear(item.y)}px`,
          position: 'absolute',
          visibility: this.showCandidate
        };
        item['circleStyle'] = {
          left: `${pixelXLinear(item.x) + 15}px`,
          bottom: `${candisateYLinear(item.y) + 25}px`,
          position: 'absolute',
          visibility: this.showCandidate
        };
      }

      if (isPDF) {
        // pdf轉成png，避免colorbar空白
        this.showImg = true;
        Plotly.toImage(gd2, {width: layoutOption.width, height: layoutOption.height}).then(dataUri => {
          this.imageSRC = dataUri;
          Plotly.d3.select(gd2.querySelector('.plotly')).remove();
          this.style['z-index'] = 0;
          this.style['opacity'] = 0.2;
          this.divStyle['text-align'] = 'left';
          for (const item of this.rectList) {
            item.color = item['svgStyle'].fill = 'rgba(0, 0, 0, 0.2)';
          }
        });

      }
    });
  }

  /**
   * show/hide UE
   * @param visible 
   */
  switchUE(visible) {
    Plotly.restyle(this.chartId, {
      visible: visible
    }, [0]);
  }

  /**
   * show/hide 障礙物
   * @param visible 
   */
  switchShowObstacle(visible) {
    this.chartService.switchShowObstacle(visible, this.rectList, this.shapes, this.annotations, this.chartId);
  }

  /**
   * show/hide BS
   * @param visible 
   */
  switchShowBs(visible) {
    if (visible == 'visible') {visible = true;} else {visible = false;}

    Plotly.restyle(this.chartId, {
      visible: visible
    }, [2]);

    for (const item of this.shapes) {
      if (item.type == 'circle' && item.fillcolor === '#005959') {
        item.visible = visible;
      }
    }
    for (const item of this.annotations) {
      if (item.text[0] == '既') {
        item.visible = visible;
      }
    }

    Plotly.relayout(this.chartId, {
      shapes: this.shapes,
      annotations: this.annotations
    });
  }

  /**
   * show/hide AP
   * @param visible 
   */
  switchShowCandidate(visible) {
    Plotly.restyle(this.chartId, {
      visible: visible
    }, [2]);

    for (const item of this.shapes) {
      if (item.type == 'rect') {
        item.visible = visible;
      }
    }
    for (const item of this.annotations) {
      if (item.text[0] == '待') {
        item.visible = visible;
      }
    }

    Plotly.relayout(this.chartId, {
      shapes: this.shapes,
      annotations: this.annotations
    });
  }

  /**
   * heatmap透明度
   */
  changeOpacity() {
    const chartElm = document.querySelectorAll(`.dlThroughputMap_chart`)[0];
    let traceNum = 1;
    if (this.authService.isEmpty(this.calculateForm.ueCoordinate)) {
      traceNum = 0;
    }
    Plotly.restyle(chartElm, {
      opacity: this.opacityValue
    }, [traceNum]);
  }

}
