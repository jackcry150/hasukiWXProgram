Component({
  data: {
    selected: 0,
    color: '#8a8a8a',
    selectedColor: '#111111',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: '../static/image/icon_home.png',
        selectedIconPath: '../static/image/icon_home_select.png'
      },
      {
        pagePath: 'pages/album/index',
        text: '图册',
        iconPath: '../static/image/icon_album.png',
        selectedIconPath: '../static/image/icon_album_select.png'
      },
      {
        pagePath: 'pages/verify/index',
        text: '校验',
        iconPath: '../static/image/icon_verify.png',
        selectedIconPath: '../static/image/icon_verify_select.png'
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
        iconPath: '../static/image/icon_my.png',
        selectedIconPath: '../static/image/icon_my_select.png'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.syncSelected()
    },
    ready() {
      this.syncSelected()
    }
  },

  pageLifetimes: {
    show() {
      this.syncSelected()
    }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = currentPage && currentPage.route
      const selected = this.data.list.findIndex((item) => item.pagePath === route)

      if (selected >= 0 && selected !== this.data.selected) {
        this.setData({ selected })
      }
    },

    switchTab(event) {
      const { index, path } = event.currentTarget.dataset

      if (Number(index) === this.data.selected) {
        return
      }

      wx.switchTab({
        url: `/${path}`
      })
    }
  }
})

