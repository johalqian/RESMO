import React, { useContext, useMemo } from 'react';
import { Card, Row, Col, Statistic, DatePicker } from 'antd';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Area, AreaChart
} from 'recharts';
import { DataContext } from '../../context/DataContext';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const DeliveryDashboard = () => {
  const { deliveryData } = useContext(DataContext);

  const chartData = useMemo(() => {
    // Sort by date ascending for charts
    return [...deliveryData].sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [deliveryData]);

  const summary = useMemo(() => {
    const totalVisitors = deliveryData.reduce((acc, curr) => acc + (curr.total_visitors || 0), 0);
    const totalCost = deliveryData.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);
    const totalTransactions = deliveryData.reduce((acc, curr) => acc + (curr.jd_search_buy || 0) + (curr.tmall_buyers || 0), 0); // Approx
    const totalAmount = deliveryData.reduce((acc, curr) => acc + (curr.amount_direct_pay || 0) + (curr.jd_search_amount || 0), 0);

    return {
      totalVisitors,
      totalCost,
      totalTransactions,
      totalAmount
    };
  }, [deliveryData]);

  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="总访客数" value={summary.totalVisitors} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总花费" value={summary.totalCost} prefix="¥" precision={2} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总成交单数 (估算)" value={summary.totalTransactions} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总成交金额" value={summary.totalAmount} prefix="¥" precision={2} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="流量趋势 (自然 vs 推广)">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="natural_visitors" name="自然访客" stroke="#8884d8" />
                  <Line type="monotone" dataKey="paid_visitors" name="推广访客" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="花费趋势">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cost_exposure" name="曝光花费" stackId="1" stroke="#ffc658" fill="#ffc658" />
                  <Area type="monotone" dataKey="cost_tmall_enter" name="天猫进店成本" stackId="1" stroke="#ff7300" fill="#ff7300" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="转化率趋势">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="natural_add_cart" name="自然加购" fill="#413ea0" yAxisId="left" />
                  <Bar dataKey="paid_add_cart" name="推广加购" fill="#ff7300" yAxisId="left" />
                  <Line type="monotone" dataKey="rate_pay_conversion" name="支付转化率" stroke="#ff0000" yAxisId="right" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeliveryDashboard;
