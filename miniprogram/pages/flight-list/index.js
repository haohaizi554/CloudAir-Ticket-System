const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    flightList: [],
    loading: true,
    displayDate: '',
    displayRoute: '',
    displayKeyword: '',
    searchParams: {} 
  },

  onLoad(options) {
    console.log('原始参数:', options)
    const clean = (str) => (str && str !== 'undefined' && str !== 'null') ? str : '';
    
    const params = {
      from: clean(options.from),
      to: clean(options.to),
      date: clean(options.date),
      keyword: clean(options.keyword)
    }

    this.setData({ searchParams: params })
    this.generateTitle(params)
    this.getFlights(params)
  },

  generateTitle(params) {
    let routeText = '所有航线'
    if (params.from && params.to) {
      routeText = `${params.from} ➝ ${params.to}`
    } else if (params.from) {
      routeText = `${params.from} 出发`
    } else if (params.to) {
      routeText = `到达 ${params.to}`
    } else if (params.keyword) {
      routeText = '搜索结果'
    }
    this.setData({
      displayDate: params.date || '日期不限',
      displayRoute: routeText,
      displayKeyword: params.keyword
    })
  },

  getFlights(params) {
    wx.showLoading({ title: '正在搜寻...' })
    const basicConditions = {}
    if (params.date) {
      basicConditions.dept_time = db.RegExp({ regexp: '^' + params.date, options: 'i' })
    }
    if (params.from) {
      basicConditions.origin = db.RegExp({ regexp: params.from, options: 'i' })
    }
    if (params.to) {
      basicConditions.dest = db.RegExp({ regexp: params.to, options: 'i' })
    }
    let finalQuery = basicConditions
    if (params.keyword) {
      const searchKey = params.keyword.trim()
      const keyReg = db.RegExp({ regexp: searchKey, options: 'i' })
      finalQuery = _.and([
        basicConditions,
        _.or([
          { flight_no: keyReg },  
          { plane_type: keyReg }  
        ])
      ])
    }
    console.log('最终查询条件:', finalQuery)
    db.collection('flights')
      .where(finalQuery)
      .get()
      .then(res => {
        const formattedList = res.data.map(item => {
          const fullDeptTime = item.dept_time || ''
          const dateStr = fullDeptTime.split(' ')[0]
          const timeStr = fullDeptTime.split(' ')[1] || '--:--'
          let arrTimeStr = '--:--'
          if (item.arr_time) {
             arrTimeStr = item.arr_time.includes(' ') ? item.arr_time.split(' ')[1] : item.arr_time
          } else {
             arrTimeStr = '待定'
          }
          return {
            ...item,
            simple_date: dateStr, // 新增：单独的日期
            simple_dept_time: timeStr,
            simple_arr_time: arrTimeStr
          }
        })
        this.setData({
          flightList: formattedList,
          loading: false
        })
        wx.hideLoading()
        if (formattedList.length === 0) {
          wx.showToast({ title: '未找到相关航班', icon: 'none' })
        }
      })
      .catch(err => {
        console.error('查询失败', err)
        wx.hideLoading()
        wx.showToast({ title: '查询出错', icon: 'none' })
      })
  },

  onBook(e) {
    const flight = e.currentTarget.dataset.flight
    const flightStr = JSON.stringify(flight)
    wx.navigateTo({
      url: `/pages/seat-select/index?flight=${encodeURIComponent(flightStr)}`
    })
  }
})