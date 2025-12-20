const drawQrcode = require('../../utils/weapp-qrcode.js')

Page({
  data: {
    order: {}
  },

  onLoad(options) {
    if (options.order) {
      const order = JSON.parse(decodeURIComponent(options.order))
      const fullTimeStr = order.flight_info.dept_time || ''
        const timeParts = fullTimeStr.split(' ') 
        const dateStr = timeParts[0] || '待定' 
        const timeStr = timeParts[1] || '--:--'
        
        this.setData({ 
          order,
          myDate: dateStr,
          myTime: timeStr,
          isQrLoading: true
        })
      const content = this.generateQRContent(order)
      setTimeout(() => {
        this.drawMyQRCode(content)
      }, 600)
    }
  },

  generateQRContent(order) {
    return `【云端航空电子登机牌】
------------------
乘客：${order.passenger_name}
航班：${order.flight_info.flight_no}
座位：${order.seat_no}
订单号：${order._id}`
  },

  drawMyQRCode(content) {
    drawQrcode({
      width: 200,
      height: 200,
      canvasId: 'myQrcode',
      text: content,
      _this: this, 
      correctLevel: 1,
      callback: (e) => {
        console.log('二维码绘制成功', e)
        this.setData({ isQrLoading: false })
      }
    })
  }
})