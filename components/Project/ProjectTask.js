/**
 * @jsx React.DOM
 */

var React = require('react');
var Moment = require('moment');
var Router = require('react-router');
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;
var _ = require('lodash');

var extend = require('extend');

/** mixins */
var initParams = require('../mixins/initParams');

/** const */
var TIME_FORMAT = 'YYYY-MM-DD HH:mm';

/** components */
var Tag = require('../Tag');
var Log = require('../Log');
var LoadIndicator = require('../LoadIndicator');
var LogClass = require('../LogClass');
var remoteStorage = require('../storage.remote');
var LoadingMask = require('../LoadingMask');
var TaskList = require('../Task/TaskList');
var Task = require('../Task/Task');

module.exports = React.createClass({
    mixins: [initParams, Router.Navigation],

    getInitialState: function () {
        return extend({
            projectLoaded: false,
            taskLoaded: false,
            tasks: []
        }, this.getStateFromParams());
    },

    getStateFromParams: function () {
        var params = this.params;
        return {
            projectId: params.projectId || null,
            taskId: params.taskId || null,
            versionId: params.versionId || null
        };
    },

    render: function () {
        var loadingMsg, projectBasicInfo, taskList;
        var project = this.state.project;
        var taskId = this.state.taskId;
        var currentVersionId = this.state.versionId;
        if (project) {
            var tags = project.tags,
                logClasses = project.classes;
            if (!_.isEmpty(tags)) {
                tags = tags.map(function (tag) {
                    return (<Tag>{tag}</Tag>);
                });
            }
            if (!_.isEmpty(logClasses)) {
                logClasses = logClasses.map(function(cls) {
                    return (<LogClass data={cls}/>);
                });
            }
            var versions, lastVersion;
            if (!_.isEmpty(project.versions)) {
                if (!currentVersionId) {
                    currentVersionId = 'all_versions';
                }
                versions = (<select onChange={this.onVersionChange} value={currentVersionId}>
                        <option value="all_versions">All Versions</option>
                    {project.versions.map(function (ver) {
                        return (<option value={ver._id}>{ver.name}</option>);
                    })}
                </select>);
            }
            var mProjectCreateTime = new Moment(project.createdTime);
            projectBasicInfo = (
                <section className="ltt_c-projectDetail-basicInfo">
                    <h1>{project.name}<span className="ltt_c-projectDetail-logClasses">{logClasses}</span></h1>
                    <p className="ltt_c-projectDetail-tags">{tags}</p>
                    <p className="ltt_c-projectDetail-times">
                        <span className="ltt-M2" title={mProjectCreateTime.format(TIME_FORMAT)}>Create: {mProjectCreateTime.fromNow()}</span>
                        <span className="ltt-M2"><i className="fa fa-child" title="last active"></i> {new Moment(project.lastActiveTime).fromNow()}</span>
                    </p>
                    {versions}
                </section>
            );
        }
        var logs;
        if (taskId) {
            logs = <aside className="ltt_c-projectTask-logs">
                    <RouteHandler params={_.pick(this.state, ['projectId', 'taskId', 'versionId'])}/>
            </aside>
        }
        return (
            <div className="ltt_c-projectTask">
                <main>
                    <div className="ltt_c-projectDetail">{projectBasicInfo}</div>
                    <TaskList>
                        {this.state.tasks.map(function (task) {
                            return <Task ref={task._id}
                                useVersion={!!currentVersionId}
                                data={task}
                                key={task._id}
                                selected={task._id === taskId}/>
                        })}
                        <LoadingMask loaded={this.state.taskLoaded}/>
                    </TaskList>
                </main>
                {logs}
                <LoadingMask loaded={this.state.projectLoaded}/>
            </div>
        );
    },

    componentDidMount: function () {
        this.loadProject(this.state.projectId);
    },

    /*shouldComponentUpdate: function (nextProps, nextState) {
        return nextProps.projectId !== this.props.projectId ||
            nextProps.versionId !== this.props.versionId;
    },*/

    componentWillReceiveProps: function (nextProps) {
        var that = this;
        //no need to load again
        if (nextProps.projectId === this.props.projectId &&
            nextProps.versionId === this.props.versionId) {
            return;
        }
        this.setState({
            projectLoaded: false,
            taskLoaded: false
        }, function () {
            this.loadProject(this.params.projectId);
            this.loadTasks(_.pick(that.params, ['projectId', 'versionId']));
        });
    },

    loadProject: function (projectId) {
        var that = this;
        remoteStorage.get('/api/projects/' + projectId)
            .then(function (res) {
                var project = res.data;
                that.setState({
                    projectLoaded: true,
                    project: project
                });
                that.loadTasks(_.pick(that.params, ['projectId', 'versionId']));
            })
            .catch(function (err) {
                console.error(err.stack);
                throw err;
            });
    },


    loadTasks: function (params) {
        var that = this;
        return remoteStorage.get('/api/tasks', params)
                .then(function (res) {
                    that.setState({
                        taskLoaded: true,
                        tasks: res.data
                    });
                }).catch(function (err) {
                    console.error(err.stack);
                });
    }
});