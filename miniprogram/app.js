// miniprogram/app.js
const wait = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        dev:"cloud1-3gejz5a4a2a8e91a",
        traceUser: true,
      })
    }
    this.globalData = {}
    //this.generateMassData()
    //this.smartFixSeats()
  },
  generateMassData() {
    const db = wx.cloud.database()
    console.log('🚀 开始批量生成随机航班和座位...')
    const START_ID = 0; //按需注入数据
    const COUNT = 0;  //按需注入数据
    const CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '三亚', '昆明', '重庆','安阳', '三门峡', '新乡', '周口', '平顶山', '许昌', '洛阳', '商丘', '濮阳', '焦作'];
    const PLANES = ['波音737', '空客A320', '波音787', '空客A330', 'C919','波音828', '空客Z320', '糖心91', '山航908', '北航828'];
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pad = (n) => n.toString().padStart(2, '0');
    let flights = [];
    let seats = [];
    for (let i = 0; i < COUNT; i++) {
      const currentIdNum = START_ID + i;
      const flightId = `FL${currentIdNum}`;
      // 1. 随机城市 (确保出发 != 到达)
      let origin = randomItem(CITIES);
      let dest = randomItem(CITIES);
      while (origin === dest) { dest = randomItem(CITIES); }
      const today = new Date();
      const futureDate = new Date(today.getTime() + randomInt(1, 30) * 24 * 60 * 60 * 1000);
      const month = pad(futureDate.getMonth() + 1);
      const day = pad(futureDate.getDate());
      const hour = randomInt(6, 22);
      const minute = randomItem([0, 15, 30, 45]);
      const deptTimeStr = `${futureDate.getFullYear()}-${month}-${day} ${pad(hour)}:${pad(minute)}`;
      let arrHour = hour + 2;
      let arrMinute = minute + 30;
      if (arrMinute >= 60) { arrMinute -= 60; arrHour += 1; }
      if (arrHour >= 24) arrHour -= 24;
      const arrTimeStr = `${pad(arrHour)}:${pad(arrMinute)}`; 
      flights.push({
        _id: flightId,
        flight_no: (Math.random() > 0.5 ? 'CA' : 'MU') + randomInt(1000, 9999),
        origin: origin,
        dest: dest,
        dept_time: deptTimeStr,
        arr_time: arrTimeStr, 
        price: randomInt(400, 2000),
        plane_type: randomItem(PLANES)
      });

      ['1', '2','3', '4','5', '6'].forEach(row => {
        ['A', 'B', 'C'].forEach(col => {
          const seatNo = row + col;
          seats.push({
            _id: `${flightId}_${seatNo}`,
            flight_id: flightId,
            seat_no: seatNo,
            // 20% 的概率座位已售，模拟真实感
            status: Math.random() < 0.2 ? 2 : 0, 
            version: 1
          });
        });
      });
    }

    console.log(`📦 准备写入 ${flights.length} 个航班和 ${seats.length} 个座位...`);

    flights.forEach(f => {
      db.collection('flights').add({ data: f })
        .then(() => console.log(`✈️ 航班 ${f.flight_no} (${f.origin}-${f.dest}) 添加成功`))
        .catch(e => console.warn(`航班写入跳过: ${e.message}`));
    });

    let seatCount = 0;
    seats.forEach(s => {
      db.collection('seats').add({ data: s })
        .then(() => {
          seatCount++;
          if (seatCount % 10 === 0) console.log(`💺 已生成 ${seatCount} 个座位...`);
        })
        .catch(() => {});
    });
  },
  async smartFixSeats() {
    const db = wx.cloud.database()
    console.log('🧠 启动“智能跳过”补全模式...')
    const countResult = await db.collection('flights').count()
    const total = countResult.total
    const MAX_LIMIT = 20
    const batchTimes = Math.ceil(total / MAX_LIMIT)
    console.log(`📊 共 ${total} 个航班，将自动跳过已完成的航班...`)
    for (let i = 0; i < batchTimes; i++) {
      console.log(`\n📡 检查第 ${i + 1}/${batchTimes} 页...`)
      const res = await db.collection('flights')
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get()
      const flights = res.data
      for (let j = 0; j < flights.length; j++) {
        const flight = flights[j]
        const seatRes = await db.collection('seats')
          .where({ flight_id: flight._id })
          .count()
        if (seatRes.total >= 18) {
          console.log(`⏩ [${flight.flight_no}] 座位完整(${seatRes.total})，跳过`)
          await wait(50) 
          continue 
        }
        console.log(`🔧 [${flight.flight_no}] 发现缺失，开始补全...`)
        await this.processOneFlight(flight)
        await wait(1000) 
      }
    }
    console.log('🎉🎉🎉 所有检查完毕！')
  },
  async processOneFlight(flight) {
    const db = wx.cloud.database()
    const flightId = flight._id
    const rows = ['1', '2', '3', '4', '5', '6']
    const cols = ['A', 'B', 'C']
    const seatsToAdd = []
    rows.forEach(row => {
      cols.forEach(col => {
        const seatNo = row + col
        seatsToAdd.push({
          _id: `${flightId}_${seatNo}`,
          flight_id: flightId,
          seat_no: seatNo,
          status: Math.random() < 0.2 ? 2 : 0,
          version: 1
        })
      })
    })
    const half = Math.ceil(seatsToAdd.length / 2);
    const batch1 = seatsToAdd.slice(0, half);
    const batch2 = seatsToAdd.slice(half);
    await Promise.all(batch1.map(s => db.collection('seats').add({ data: s }).catch(() => {})))
    await Promise.all(batch2.map(s => db.collection('seats').add({ data: s }).catch(() => {})))
  }
})