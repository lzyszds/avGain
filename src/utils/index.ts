import { ElMessage, ElMessageBox, dayjs } from "element-plus"
import type { messageType } from "element-plus"
import * as echarts from "echarts";

export const LzyConfirm = ({
  title = 'Warning',
  content = 'proxy will permanently delete the file. Continue?',
  confirmButtonText = 'OK',
  cancelButtonText = 'Cancel',
  type = 'warning' as messageType,
  confirm = () => { },
  error = () => { },
}) => {
  return ElMessageBox.confirm(
    content,
    title,
    {
      confirmButtonText,
      cancelButtonText,
      type,
    }
  ).then(confirm).catch(error)
}


export const LzyAlert = ({
  title = 'Warning',
  content = 'proxy will permanently delete the file. Continue?',
  confirmButtonText = 'OK',
  type = 'warning' as messageType,
  confirm = () => { },
}) => {
  return ElMessageBox.alert(
    content,
    title,
    {
      confirmButtonText,
      type,
    }
  ).then(confirm)
}

//格式化文件大小
export function formatFileSize(fileSize: any) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024;
    index++;
  }

  return fileSize.toFixed(2) + units[index];
}

//处理下载进程下载进度echart图表 监听进程的下载进度
export function handleEchart(data: any) {
  console.log(`lzy  data:`, data)

  const echartMain = document.querySelector(".echartMain") as HTMLElement;
  const workerEchart = echarts.init(echartMain);
  var option = {
    tooltip: {
      trigger: "item",
      formatter: function (params: any) {
        return params.name + "所用时间: " + dayjs(params.value * 1000).format("mm:ss");
      },
      axisPointer: {
        type: "line",
      },
    },
    grid: {
      top: "15%",
      left: "3%",
      right: "4%",
      bottom: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: Object.keys(data),
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "aa",
        type: "line",
        data: Object.values(data),
        itemStyle: {
          color: "#7D2AE8", // 这里填写你期望的颜色，比如'#61a0a8'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: "rgb(255, 158, 68)",
            },
            {
              offset: 1,
              color: "rgb(255, 70, 131)",
            },
          ]),
        },
      },
    ],
  };
  workerEchart.setOption(option);
  return workerEchart;
}

//速度仪表盘echarts
export function handleSpeedEchart() {
  const speedEcharts = document.querySelector(".speedEcharts") as HTMLElement;
  const speedEchart = echarts.init(speedEcharts);
  let option = {
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        center: ["50%", "70%"], // 调整仪表盘的中心位置
        radius: "130%", // 调整仪表盘的半径大小
        min: 0,
        max: 120,
        splitNumber: 6,
        itemStyle: {
          color: "#58D9F9",
          shadowColor: "rgba(0,138,255,0.45)",
          shadowBlur: 10,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
        progress: {
          show: true,
          roundCap: true,
          width: 12,
        },
        pointer: {
          icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
          length: "75%",
          width: 16,
          offsetCenter: [0, "5%"],
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 18,
          },
        },
        axisTick: {
          splitNumber: 2,
          lineStyle: {
            width: 2,
            color: "#999",
          },
        },
        splitLine: {
          length: 12,
          lineStyle: {
            width: 3,
            color: "#999",
          },
        },
        axisLabel: {
          distance: 30,
          color: "#999",
          fontSize: 12,
        },
        title: {
          show: false,
        },
        detail: {
          backgroundColor: "#fff",
          borderColor: "#999",
          borderWidth: 2,
          width: "80%",
          lineHeight: 25,
          height: 20,
          borderRadius: 8,
          offsetCenter: [0, "30%"],
          valueAnimation: true,
          formatter: function (value: number) {
            return "{value|" + value.toFixed(0) + "}{unit|MB/s}";
          },
          rich: {
            value: {
              fontSize: 30,
              fontWeight: "bolder",
              color: "#777",
            },
            unit: {
              fontSize: 15,
              color: "#999",
              padding: [0, 0, -10, 10],
            },
          },
        },
        data: [
          {
            value: 0,
          },
        ],
      },
    ],
  };
  speedEchart.setOption(option);
  return speedEchart
}

export function handleLogData(val: any[]) {
  if (!val) return []
  return val
    .map((res) => res.split(" ")[2].replace("线程", ""))
    .reduce((a, b) => {
      if (a[b - 1]) {
        a[b - 1]++;
      } else {
        a[b - 1] = 1;
      }
      return a;
    }, []);
}

export function getVideoId(val: string) {
  let reg = /[a-zA-Z]{2,6}-\d{3,4}/
  //使用正则
  const result = val.match(reg)
  return result ? val.split(' ')[0].replace('[无码破解]', "") : null
}
