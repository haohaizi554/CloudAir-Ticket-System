// pages/order-list/index.js
const db = wx.cloud.database()

Page({
  data: {
    orderList: [],
    loading: true,
    currentUser: null
  },

  onShow() {
    const user = wx.getStorageSync('currentUser')
    if (user) {
      this.setData({ currentUser: user })
    }
    this.getMyOrders()
  },

  // 获取我的订单
  getMyOrders() {
    wx.showLoading({ title: '加载订单...' })

    db.collection('orders')
      .orderBy('create_time', 'desc')
      .get()
      .then(res => {
        console.log('我的订单:', res.data)
        this.setData({
          orderList: res.data,
          loading: false
        })
        wx.hideLoading()
      })
      .catch(err => {
        console.error('加载失败', err)
        wx.hideLoading()
      })
  },

  // 退票逻辑
  onRefund(e) {
    const order = e.currentTarget.dataset.order
    
    // 严谨性：二次确认
    wx.showModal({
      title: '退票确认',
      content: '确定要退掉这张票吗？座位将释放给他人。',
      success: (res) => {
        if (res.confirm) {
          this.executeRefund(order)
        }
      }
    })
  },

  // 执行退票事务
  executeRefund(order) {
    wx.showLoading({ title: '正在退票...' })

    // 第一步：将订单状态改为 2 (已退票)
    db.collection('orders').doc(order._id).update({
      data: {
        status: 2 
      }
    }).then(() => {
      // 第二步：释放座位库存 (将 seats 表对应记录 status 改回 0)
      // 严谨性：必须释放资源，否则这个座位就“死”了
      return db.collection('seats').doc(order.seat_id).update({
        data: {
          status: 0 // 0 代表空闲
        }
      })
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '退票成功', icon: 'success' })
      
      // 刷新列表
      this.getMyOrders()
    }).catch(err => {
      console.error('退票失败', err)
      wx.hideLoading()
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  onShowCode(e) {
    const order = e.currentTarget.dataset.order
    // 转成字符串传递
    const orderStr = encodeURIComponent(JSON.stringify(order))
    
    wx.navigateTo({
      url: `/pages/boarding-pass/index?order=${orderStr}`
    })
  }
})