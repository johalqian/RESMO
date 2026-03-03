# RESMO 瑞摩 PMS

RESMO 瑞摩产品管理系统 (Product Management System) 的前端实现。

## 技术栈

- **React** (Vite)
- **Ant Design** (UI 组件库)
- **Tailwind CSS** (样式工具)
- **Recharts** (图表库)
- **React Router** (路由管理)

## 功能模块

1.  **仪表盘 (Dashboard)**: 实时统计数据、模块分布图、生命周期状态图、产品分级分布图、最新产品动态。
2.  **产品管理 (Product Management)**: 产品列表展示、搜索、筛选（模块/品类/状态）、新增产品。
3.  **产品矩阵 (Product Matrix)**: 可视化各品类下的产品分布情况（卫浴/净水）。
4.  **产品规划 (Product Planning)**: 管理规划阶段的产品卡片展示。
5.  **品类管理 (Category Management)**: 卫浴和净水模块下的品类管理。

## 运行项目

1.  安装依赖:
    ```bash
    npm install
    ```

2.  启动开发服务器:
    ```bash
    npm run dev
    ```

3.  构建生产版本:
    ```bash
    npm run build
    ```

## 目录结构

- `src/layouts`: 布局组件 (MainLayout)
- `src/pages`: 页面组件 (Dashboard, ProductList, etc.)
- `src/components`: 通用组件
- `src/assets`: 静态资源
