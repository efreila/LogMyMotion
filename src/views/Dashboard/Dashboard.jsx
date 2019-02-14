import React, { Component } from "react";
import ChartistGraph from "react-chartist";
import { PanelGroup, Panel, Nav, NavItem, Tab, Grid, Row, Col } from 'react-bootstrap';

// react components used to create a SVG / Vector map
import { VectorMap } from "react-jvectormap";

import Card from "../../components/Card/Card.jsx";
import { StatsCard } from "../../components/StatsCard/StatsCard.jsx";
import { Tasks } from "../../components/Tasks/Tasks.jsx";
import {
  dataPie,
  dataSales,
  optionsSales,
  responsiveSales,
  dataBar,
  optionsBar,
  responsiveBar,
  table_data
} from "../../variables/Variables.jsx";
import { AuthUserContext, withAuthorization } from '../../components/Session';

var mapData = {
  AU: 760,
  BR: 550,
  CA: 120,
  DE: 1300,
  FR: 540,
  GB: 690,
  GE: 200,
  IN: 200,
  RO: 600,
  RU: 300,
  US: 2920
};





class Dashboard extends Component {
  createTableData() {
    var tableRows = [];
    for (var i = 0; i < table_data.length; i++) {
      tableRows.push(
        <tr key={i}>
          <td>
            <div className="flag">
              <img src={table_data[i].flag} alt="us_flag" />
            </div>
          </td>
          <td>{table_data[i].country}</td>
          <td className="text-right">{table_data[i].count}</td>
          <td className="text-right">{table_data[i].percentage}</td>
        </tr>
      );
    }
    return tableRows;
  }
  render() {

    let cueHistoryGraph = (workout, eventKey ) => (
      <Tab.Pane eventKey={eventKey}>
        <Card
          title={workout}
          content={
            <ChartistGraph
              data={dataBar}
              type="Bar"
              options={optionsBar}
              responsiveOptions={responsiveBar}
            />
          }
          legend={
            <div>
              <i className="fa fa-circle text-info" /> Good Cue
              <i className="fa fa-circle text-danger" /> Bad Cue
            </div>
          }
          stats={
            <div>
              <i className="fa fa-check" /> Data information certified
            </div>
          }
        />
      </Tab.Pane>
    );

    return (
      <AuthUserContext.Consumer>
        {authUser => (
      <div className="main-content">
        <Grid fluid>
          <Row>
            <Col lg={3} sm={6}>
              <StatsCard
                bigIcon={<i className="pe-7s-server text-warning" />}
                statsText="10"
                statsIcon={<i className="fa fa-refresh" />}
                statsIconText="Days since last workout"
              />
            </Col>
            <Col lg={3} sm={6}>
              <StatsCard
                bigIcon={<i className="pe-7s-wallet text-success" />}
                statsText="Revenue"
                statsValue="$1,345"
                statsIcon={<i className="fa fa-calendar-o" />}
                statsIconText="Last day"
              />
            </Col>
            <Col lg={3} sm={6}>
              <StatsCard
                bigIcon={<i className="pe-7s-graph1 text-danger" />}
                statsText="Errors"
                statsValue="23"
                statsIcon={<i className="fa fa-clock-o" />}
                statsIconText="In the last hour"
              />
            </Col>
            <Col lg={3} sm={6}>
              <StatsCard
                bigIcon={<i className="fa fa-twitter text-info" />}
                statsText="Followers"
                statsValue="+45"
                statsIcon={<i className="fa fa-refresh" />}
                statsIconText="Updated now"
              />
            </Col>
          </Row>
          <Row>
            <Col lg={150}>
              <Card
                title="Users Behavior"
                category="24 Hours performance"
                content={
                  <ChartistGraph
                    data={dataSales}
                    type="Line"
                    options={optionsSales}
                    responsiveOptions={responsiveSales}
                  />
                }
                legend={
                  <div>
                    <i className="fa fa-circle text-info" /> Open
                    <i className="fa fa-circle text-danger" /> Click
                    <i className="fa fa-circle text-warning" /> Click Second
                    Time
                  </div>
                }
                stats={
                  <div>
                    <i className="fa fa-history" /> Updated 3 minutes ago
                  </div>
                }
              />
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Tab.Container id="tabs-with-dropdown" defaultActiveKey="1">
                <Row className="clearfix">
                  <Col sm={12}>
                    <Nav bsStyle="tabs">
                      <NavItem eventKey="1">Squat</NavItem>
                      <NavItem eventKey="2">Bench Press</NavItem>
                      <NavItem eventKey="3">Barbell Rows</NavItem>
                    </Nav>
                  </Col>
                  <Col sm={12}>
                    <Tab.Content animation>
                      {cueHistoryGraph("Squat Cue History", "1")}
                    </Tab.Content>
                  </Col>
                </Row>
              </Tab.Container>
            </Col>
            <Col md={6}>
              <Card
                title="Tasks"
                category="Backend development"
                content={
                  <table className="table">
                    <Tasks />
                  </table>
                }
                stats={
                  <div>
                    <i className="fa fa-history" /> Updated 3 minutes ago
                  </div>
                }
              />
            </Col>
          </Row>
        </Grid>
      </div>
      )}
      </AuthUserContext.Consumer>
    );
  }
}

const condition = authUser => !!authUser;

export default withAuthorization(condition)(Dashboard);
