Page({
  data: {
    fromCity: '北京',
    toCity: '上海',
    date: '2023-12-01', 
    keyword: '',
    banners: [
      {
        id: 1,
        url: '/images/banner1.png', 
        title: '云端之旅'
      },
      {
        id: 2,
        url: '/images/banner2.png',
        title: '繁华都市'
      },
      {
        id: 3,
        url: '/images/banner3.png',
        title: '海岛度假'
      }
    ]
  },

  // 1. 监听出发地输入
  onInputFrom(e) {
    this.setData({ fromCity: e.detail.value })
  },

  // 2. 监听目的地输入
  onInputTo(e) {
    this.setData({ toCity: e.detail.value })
  },

  // 3. 监听日期选择
  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  // 4. ▼▼▼ 新增：监听关键词输入 ▼▼▼
  onInputKeyword(e) {
    this.setData({ keyword: e.detail.value })
  },

  onClearDate() {
    this.setData({ date: '' })
  },
  
  // 5. 点击搜索按钮
  onSearch() {
    const { fromCity, toCity, date, keyword } = this.data
    if (fromCity && toCity && fromCity === toCity) {
      wx.showToast({ title: '出发地和目的地不能相同', icon: 'none' })
      return
    }
    const hasCondition = fromCity || toCity || date || keyword
    if (!hasCondition) {
      wx.showToast({ title: '请至少填写一个搜索条件', icon: 'none' })
      return
    }
    const url = `/pages/flight-list/index?from=${fromCity}&to=${toCity}&date=${date}&keyword=${keyword}`
    console.log('准备跳转，URL:', url)
    wx.navigateTo({
      url: url,
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.error('跳转失败', err)
        wx.showModal({
          title: '错误',
          content: '页面跳转失败，请检查 app.json 是否配置了 pages/flight-list/index'
        })
      }
    })
  }
})