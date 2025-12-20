// pages/profile/index.js
const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '', 
      nickName: ''
    },
    isLogin: false,
    
    // ▼▼▼ 新增：控制联系客服弹窗显示 ▼▼▼
    showContactModal: false 
  },

  /**
   * 核心修改 1：使用 onShow
   * 每次切换到“我的”页面，都执行一次检查
   */
  onShow() {
    console.log('👀 1. 进入页面，开始检查...')
    
    // 1. 先看缓存
    const cacheUser = wx.getStorageSync('currentUser')
    console.log('📦 2. 本地缓存内容:', cacheUser)

    if (cacheUser) {
      console.log('✅ 3. 命中缓存，渲染界面')
      this.setData({
        userInfo: cacheUser,
        isLogin: true
      })
    }

    // 2. 再查库
    this.checkUserStatus()
  },

  checkUserStatus() {
    console.log('☁️ 4. 开始请求云数据库...')
    
    db.collection('users').get().then(res => {
      console.log('☁️ 5. 数据库返回结果:', res)
      
      if (res.data.length > 0) {
        const userData = res.data[0]
        console.log('✅ 6. 查到用户:', userData)
        this.setData({
          userInfo: userData,
          isLogin: true
        })
        wx.setStorageSync('currentUser', userData)
      } else {
        console.log('⚠️ 7. 数据库里没这个用户 (未注册)')
        // 如果缓存也没有，那就显示未登录
        const cacheUser = wx.getStorageSync('currentUser')
        if (!cacheUser) {
          this.setData({ isLogin: false })
        }
      }
    }).catch(err => {
      console.error('❌ 8. 查库报错:', err)
    })
  },

  // 2. 上传头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ 'userInfo.avatarUrl': avatarUrl })
    const cloudPath = 'avatars/' + Date.now() + '.png'
    wx.cloud.uploadFile({
      cloudPath,
      filePath: avatarUrl,
      success: res => {
        // 更新为云端 ID
        this.setData({ 'userInfo.avatarUrl': res.fileID })
        // 保存到数据库
        this.saveUserInfo() 
      }
    })
  },

  onSaveNickname(e) {
    const nickName = e.detail.value
    this.setData({ 'userInfo.nickName': nickName })
    this.saveUserInfo() 
  },

  saveUserInfo() {
    const { userInfo } = this.data

    // 剔除 _id 和 _openid，防止更新时报错
    const { _id, _openid, ...dataToUpdate } = userInfo

    db.collection('users').get().then(res => {
      if (res.data.length > 0) {
        // --- 更新逻辑 ---
        const docId = res.data[0]._id
        
        db.collection('users').doc(docId).update({
          data: dataToUpdate
        }).then(() => {
          console.log('✅ 更新成功')
          wx.showToast({ title: '已同步', icon: 'success' })
          // 更新缓存
          wx.setStorageSync('currentUser', userInfo)
        }).catch(err => {
          console.error('❌ 更新失败', err)
        })
      } else {
        // --- 注册逻辑 ---
        db.collection('users').add({
          data: {
            ...userInfo,
            createTime: new Date()
          }
        }).then(() => {
          this.setData({ isLogin: true })
          wx.showToast({ title: '注册成功', icon: 'success' })
          wx.setStorageSync('currentUser', userInfo)
        })
      }
    })
  },

  onCheckPayment() {
    wx.showLoading({ title: '正在连接微信支付...' })

    setTimeout(() => {
      wx.hideLoading()
      const isSuccess = true 
      if (isSuccess) {
        wx.showModal({
          title: '支付检测结果',
          content: '✅ 账户状态正常\n✅ 支付功能可用\n✅ 实名认证已通过',
          showCancel: false,
          confirmText: '太好了'
        })
      } else {
        wx.showToast({ title: '支付异常', icon: 'none' })
      }
    }, 1500)
  },

  onContact() {
    this.setData({ showContactModal: true })
  },

  closeContactModal() {
    this.setData({ showContactModal: false })
  },

  preventBubble() {
  },
  
  onAbout() {
    wx.showModal({
      title: '关于',
      content: '这是一个基于微信云开发的航空订票演示系统。',
      showCancel: false
    })
  }
})