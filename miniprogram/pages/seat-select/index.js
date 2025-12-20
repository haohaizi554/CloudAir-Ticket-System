// pages/seat-select/index.js
const db = wx.cloud.database()
const _ = db.command
const app = getApp()

Page({
  data: {
    flight: {},     // 当前航班信息
    seats: [],      // 座位列表
    selectedSeat: null // 当前选中的座位对象
  },

  onLoad(options) {
    // 1. 解析上一页传来的航班信息
    if (options.flight) {
      const flight = JSON.parse(decodeURIComponent(options.flight))
      this.setData({ flight })
      
      // 2. 去数据库查这个航班的座位
      this.getSeats(flight._id)
    }
  },

  // 获取座位库存
  getSeats(flightId, isRefresh = false) {
    
    // 只有在“非下拉刷新”（即第一次进入）时，才显示全屏转圈
    if (!isRefresh) {
      wx.showLoading({ title: '加载座位...' })
    }

    db.collection('seats')
      .where({ flight_id: flightId })
      .orderBy('seat_no', 'asc') 
      .get()
      .then(res => {
        this.setData({ seats: res.data })
        
        if (isRefresh) {
          // --- 情况A：如果是下拉刷新 ---
          wx.stopPullDownRefresh() // 1. 先收起顶部的三个点
          
          // 2. 弹出一个显眼的提示，停留 1.5 秒
          wx.showToast({
            title: '座位状态已更新',
            icon: 'success',
            duration: 1500, // 停留时间
            mask: true      // 防止用户乱点
          })
        } else {
          // --- 情况B：如果是首次加载 ---
          wx.hideLoading() // 直接关掉转圈
        }
      })
      .catch(err => {
        console.error('加载座位失败', err)
        
        if (isRefresh) {
          wx.stopPullDownRefresh()
          wx.showToast({ title: '刷新失败', icon: 'none', duration: 2000 })
        } else {
          wx.hideLoading()
          wx.showToast({ title: '加载出错', icon: 'none' })
        }
      })
  },

  // 下拉刷新监听
  onPullDownRefresh() {
    if (this.data.flight._id) {
      this.getSeats(this.data.flight._id, true)
    }
  },

  // 用户点击某个座位
  onSelectSeat(e) {
    const seat = e.currentTarget.dataset.seat
    
    // 严谨性：如果座位已售(status > 0)，禁止选择
    if (seat.status > 0) {
      wx.showToast({ title: '该座位已被占用', icon: 'none' })
      return
    }

    // 切换选中状态
    this.setData({ selectedSeat: seat })
  },

  // 提交订单 (核心事务 - 逻辑已修正)
  onSubmitOrder() {
    if (!this.data.selectedSeat) return

    // 1. 校验用户登录状态 (直接读缓存，保证速度)
    const user = wx.getStorageSync('currentUser')
    if (!user || !user.nickName) { 
      wx.showModal({
        title: '提示',
        content: '请先去“我的”页面登录并完善个人信息',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/index' })
          }
        }
      })
      return
    }

    wx.showLoading({ title: '正在处理...' })
    const { flight, selectedSeat } = this.data

    // 🔥 核心修改：先锁座，再下单！
    // 这样可以确保只有真正抢到座位的人，才能生成订单
    
    // 第一步：尝试修改座位状态
    db.collection('seats').doc(selectedSeat._id).update({
      data: { status: 2 }
    }).then(res => {
      // res.stats.updated 表示实际更新的行数
      // 如果是 0，说明座位可能刚刚被别人抢走了，或者权限不够
      if (res.stats.updated === 0) {
        throw new Error('座位锁定失败，可能已被抢购')
      }

      // 第二步：座位锁定成功，才创建订单
      return db.collection('orders').add({
        data: {
          flight_id: flight._id,
          flight_info: flight, 
          seat_id: selectedSeat._id,
          seat_no: selectedSeat.seat_no,
          passenger_name: user.nickName, 
          passenger_avatar: user.avatarUrl,
          price: flight.price,
          status: 1, 
          create_time: new Date()
        }
      })
    }).then(res => {
      // 第三步：全部成功
      console.log('订单创建成功, ID:', res._id)
      wx.hideLoading()
      wx.showToast({ title: '预订成功', icon: 'success' })
      
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/order-list/index'
        })
      }, 1500)
    }).catch(err => {
      console.error('交易失败', err)
      wx.hideLoading()
      
      // 区分错误类型提示
      let errMsg = '下单失败，请重试'
      if (err.message && err.message.includes('座位锁定失败')) {
        errMsg = '手慢了，座位已被抢走'
        // 刷新一下座位图
        this.getSeats(flight._id)
      } else if (err.errMsg && err.errMsg.includes('permission denied')) {
        errMsg = '权限不足，请检查seats表权限' // 提示你去改数据库权限
      }

      wx.showModal({
        title: '提示',
        content: errMsg,
        showCancel: false
      })
    })
  }
})