import React, { useState, useCallback, useEffect } from 'react';
import {
    Form,
    Input,
    Select,
    Button,
    Card,
    Alert,
    InputNumber,
    Space,
    Tag,
    Checkbox,
    Collapse,
    Typography, message
} from 'antd';
import {
    EnvironmentOutlined,
    PlusOutlined,
    FireFilled,
    UserOutlined,
    HeartOutlined,
    BilibiliOutlined,
    TrophyOutlined,
    CompassOutlined,
    ContactsOutlined,
    BookOutlined
} from '@ant-design/icons';
import styles from '../../assets/css/friend/CreateFriendProfile.module.css';
import FriendLayout from './FriendLayout';

const { Option } = Select;
const { Title } = Typography;
const { Panel } = Collapse;

// 匹配类型配置
const MATCH_TYPES = [
    { value: 'GAME', label: '游戏搭子', description: '寻找游戏好友一起组队' },
    { value: 'HOBBY', label: '兴趣搭子', description: '找到志同道合的兴趣伙伴' },
    { value: 'STUDY', label: '学习搭子', description: '结识学习伙伴互相进步' },
    { value: 'SPORTS', label: '运动搭子', description: '找到运动伙伴一起锻炼' },
    { value: 'TALENT', label: '特长搭子', description: '与特长互补的朋友一起提升' },
    { value: 'TRAVEL', label: '旅游搭子', description: '寻找志同道合的旅行伙伴' }
];

// 联系方式类型配置
const CONTACT_TYPES = [
    { value: 'QQ', label: 'QQ' },
    { value: 'WECHAT', label: '微信' },
    { value: 'PHONE', label: '手机号' },
    { value: 'EMAIL', label: '邮箱' }
];

// 技能等级配置
const GAME_SKILL_LEVELS = [
    { value: 'BEGINNER', label: '入门', description: '新手玩家' },
    { value: 'INTERMEDIATE', label: '进阶', description: '熟练玩家' },
    { value: 'ADVANCED', label: '精通', description: '高手玩家' },
    { value: 'EXPERT', label: '专家', description: '资深玩家' }
];

// 技能等级配置
const TALENT_SKILL_LEVELS = [
    { value: 'BEGINNER', label: '入门', description: '新手玩家' },
    { value: 'INTERMEDIATE', label: '进阶', description: '熟练玩家' },
    { value: 'ADVANCED', label: '精通', description: '高手玩家' },
    { value: 'PROFESSIONAL', label: '专家', description: '资深玩家' }
];


// 季节选项配置
const SEASONS = [
    { value: 'SPRING', label: '春季' },
    { value: 'SUMMER', label: '夏季' },
    { value: 'AUTUMN', label: '秋季' },
    { value: 'WINTER', label: '冬季' }
];

// 旅行类型配置
const TRAVEL_TYPES = [
    { value: 'CULTURAL', label: '文化游', description: '参观历史文化景点' },
    { value: 'SCENERY', label: '风景游', description: '欣赏自然风光' },
    { value: 'FOOD', label: '美食游', description: '品尝当地美食' },
    { value: 'ADVENTURE', label: '探险游', description: '体验刺激冒险' },
    { value: 'SHOPPING', label: '购物游', description: '享受购物乐趣' },
    { value: 'PHOTOGRAPHY', label: '摄影游', description: '拍摄美景美食' }
];

const CreateFriendProfile = () => {
    const [form] = Form.useForm();

    // 状态管理
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [hobbies, setHobbies] = useState([]);
    const [gameSkills, setGameSkills] = useState([]);
    const [talents, setTalents] = useState([]);
    const [sports, setSports] = useState([]);
    const [travelDestinations, setTravelDestinations] = useState([]);
    const [studySubjects, setStudySubjects] = useState([]);
    const [studySubjectInput, setStudySubjectInput] = useState('');
    // 输入控制状态
    const [hobbyInputVisible, setHobbyInputVisible] = useState(false);
    const [hobbyInputValue, setHobbyInputValue] = useState('');
    const [sportInputValue, setSportInputValue] = useState('');
    // 新增：标记是否为编辑模式
    const [isEditMode, setIsEditMode] = useState(false);

    // 折叠面板默认展开的面板
    const defaultActiveKeys = ['basicInfo'];

    // 在组件加载时自动获取用户档案并填充表单
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch('http://127.0.0.1:8080/api/friend/my-profile', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const profileData = await response.json();

                    // 填充表单数据
                    setHobbies(profileData.hobbies || []);
                    setGameSkills(profileData.gameSkills || []);
                    setTalents(profileData.talents || []);
                    setSports(profileData.sports || []);
                    setTravelDestinations(profileData.travelDestinations || []);
                    setStudySubjects(profileData.studySubjects || []);

                    // 设置基本表单字段
                    form.setFieldsValue({
                        university: profileData.university,
                        latitude: profileData.latitude,
                        longitude: profileData.longitude,
                        preferredMatchType: profileData.preferredMatchType,
                        contactType: profileData.contactType,
                        contactNumber: profileData.contactNumber
                    });

                    // 设置为编辑模式
                    setIsEditMode(true);
                    message.success('已自动加载您的档案信息');
                }
            } catch (error) {
                console.error('获取用户档案失败:', error);
                // 获取失败不显示错误，因为可能是用户没有档案
            }
        };

        fetchUserProfile();
    }, [form]);

    // 处理位置信息获取
    const handleGetLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    form.setFieldsValue({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('定位失败:', error);
                    setError('获取位置信息失败，请手动输入');
                }
            );
        } else {
            setError('您的浏览器不支持地理定位');
        }
    }, [form]);

    // 处理兴趣爱好添加
    const handleHobbyAdd = useCallback(() => {
        if (hobbyInputValue && !hobbies.includes(hobbyInputValue)) {
            const newHobbies = [...hobbies, hobbyInputValue];
            setHobbies(newHobbies);
            form.setFieldsValue({ hobbies: newHobbies });
        }
        setHobbyInputVisible(false);
        setHobbyInputValue('');
    }, [hobbyInputValue, hobbies, form]);

    // 处理游戏技能添加
    const handleGameSkillAdd = () => {
        const values = form.getFieldValue('gameSkill');
        if (values && values.name && values.level) {
            const newSkill = {
                gameName: values.name,
                skillLevel: values.level,
                rank: values.rank || '', // 添加rank字段
                preferredPosition: values.position || ''
            };
            setGameSkills([...gameSkills, newSkill]);
            // 清空表单
            form.setFieldsValue({
                gameSkill: {
                    name: '',
                    level: undefined,
                    rank: '',
                    position: ''
                }
            });
        }
    };

    // 处理特长添加的函数
    const handleTalentAdd = () => {
        const values = form.getFieldValue('talent');
        // 确保所需字段都存在再进行添加
        if (values?.name && values?.level) {
            const newTalent = {
                talentName: values.name,
                proficiency: values.level,
                certification: values.certification || '', // 添加可选的认证信息
                canTeach: values.canTeach || false
            };

            // 使用函数式更新确保获取最新状态
            setTalents(prevTalents => [...prevTalents, newTalent]);

            // 重置表单字段
            form.setFieldsValue({
                talent: {
                    name: '',
                    level: undefined,
                    certification: '',
                    canTeach: false
                }
            });
        }
    };

    // 处理运动项目添加
    const handleSportAdd = () => {
        if (sportInputValue && !sports.includes(sportInputValue)) {
            const newSports = [...sports, sportInputValue];
            setSports(newSports);
            form.setFieldsValue({ sports: newSports });
            setSportInputValue('');
        }
    };

    // 处理目的地添加的函数
    const handleDestinationAdd = () => {
        const values = form.getFieldValue('destination');

        // 检查必填字段是否都已填写
        if (!values?.name || !values?.province || !values?.type) {
            message.error('请填写完整的目的地信息');
            return;
        }

        // 创建新的目的地对象，包含所有必要字段
        const newDestination = {
            destination: values.name,
            province: values.province,
            country: values.country || '中国', // 设置默认值
            travelType: values.type,
            expectedSeason: values.season || 'SPRING' // 设置默认季节
        };

        // 更新目的地列表
        setTravelDestinations(prevDestinations => [...prevDestinations, newDestination]);

        // 清空表单字段
        form.setFieldsValue({
            destination: {
                name: '',
                province: '',
                country: '中国',
                type: undefined,
                season: undefined
            }
        });
    };

    // 处理学习科目添加
    const handleStudySubjectAdd = () => {
        if (studySubjectInput && !studySubjects.includes(studySubjectInput)) {
            const newSubjects = [...studySubjects, studySubjectInput];
            setStudySubjects(newSubjects);
            form.setFieldsValue({ studySubjects: newSubjects });
            setStudySubjectInput('');
        }
    };

    // 表单提交逻辑
    const handleSubmit = async (values) => {
        // 如果有未添加的输入，提示用户
        const hasUnaddedTalent = values.talent?.name || values.talent?.level;
        const hasUnaddedDestination = values.destination?.name || values.destination?.province;

        if (hasUnaddedTalent || hasUnaddedDestination) {
            message.warning('您有未添加的信息，请先点击添加按钮将信息添加到列表中');
            return;
        }

        setLoading(true);
        try {
            const formData = {
                university: values.university,
                latitude: values.latitude,
                longitude: values.longitude,
                preferredMatchType: values.preferredMatchType,
                contactType: values.contactType,
                contactNumber: values.contactNumber,
                hobbies: hobbies,
                gameSkills: gameSkills,
                talents: talents,
                sports: sports,
                studySubjects: studySubjects, // 添加学习科目
                travelDestinations: travelDestinations,
                availableTimes: [] // 如果需要可以添加时间槽处理
            };

            const response = await fetch('http://127.0.0.1:8080/api/friend/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                message.success(isEditMode ? '档案更新成功' : '档案创建成功');
                window.location.href = '/friend';
            } else {
                throw new Error(isEditMode ? '更新档案失败' : '创建档案失败');
            }
        } catch (error) {
            console.error('提交档案失败:', error);
            setError(isEditMode ? '更新档案失败，请稍后重试' : '创建档案失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FriendLayout background="create-profile">
            <Card className={styles.formCard}>
                <Title level={2} className={styles.title}>
                    {isEditMode ? '编辑搭子档案' : '创建搭子档案'}
                </Title>
                {error && (
                    <Alert
                        message="错误提示"
                        description={error}
                        type="error"
                        showIcon
                        closable
                        className={styles.errorAlert}
                    />
                )}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className={styles.form}
                >
                    <Collapse defaultActiveKey={defaultActiveKeys} className={styles.formCollapse}>
                        {/* 基本信息面板 */}
                        <Panel
                            header="基本信息"
                            key="basicInfo"
                            extra={<UserOutlined />}
                            className={styles.collapsePanel}
                        >
                            <div className={styles.panelContent}>
                                <Form.Item
                                    name="university"
                                    label="学校"
                                    rules={[{ required: true, message: '请输入您的学校' }]}
                                >
                                    <Input placeholder="请输入您的学校" />
                                </Form.Item>

                                <Space className={styles.locationInputs}>
                                    <Form.Item
                                        name="latitude"
                                        label="纬度"
                                        rules={[{ required: true, message: '请输入纬度' }]}
                                    >
                                        <InputNumber
                                            placeholder="纬度"
                                            className={styles.locationInput}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="longitude"
                                        label="经度"
                                        rules={[{ required: true, message: '请输入经度' }]}
                                    >
                                        <InputNumber
                                            placeholder="经度"
                                            className={styles.locationInput}
                                        />
                                    </Form.Item>

                                    <Button
                                        type="default"
                                        icon={<EnvironmentOutlined />}
                                        onClick={handleGetLocation}
                                    >
                                        获取位置
                                    </Button>
                                </Space>

                                <Form.Item
                                    name="preferredMatchType"
                                    label="首选匹配类型"
                                    rules={[{ required: true, message: '请选择首选匹配类型' }]}
                                >
                                    <Select placeholder="选择您想寻找的搭子类型">
                                        {MATCH_TYPES.map(type => (
                                            <Option key={type.value} value={type.value}>
                                                {type.label} - {type.description}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </div>
                        </Panel>

                        {/* 兴趣爱好面板 */}
                        <Panel
                            header="兴趣爱好"
                            key="hobbies"
                            extra={<HeartOutlined />}
                            className={styles.collapsePanel}
                        >
                            <div className={styles.panelContent}>
                                <div className={styles.tagContainer}>
                                    {hobbies.map(hobby => (
                                        <Tag
                                            key={hobby}
                                            closable
                                            onClose={() => {
                                                const newHobbies = hobbies.filter(h => h !== hobby);
                                                setHobbies(newHobbies);
                                                form.setFieldsValue({ hobbies: newHobbies });
                                            }}
                                            className={styles.tag}
                                        >
                                            {hobby}
                                        </Tag>
                                    ))}
                                </div>
                                <Space className={styles.inputContainer}>
                                    {hobbyInputVisible ? (
                                        <Input
                                            type="text"
                                            size="middle"
                                            value={hobbyInputValue}
                                            onChange={e => setHobbyInputValue(e.target.value)}
                                            onBlur={handleHobbyAdd}
                                            onPressEnter={handleHobbyAdd}
                                            className={styles.input}
                                            placeholder="输入兴趣爱好"
                                        />
                                    ) : (
                                        <Button
                                            type="dashed"
                                            onClick={() => setHobbyInputVisible(true)}
                                            icon={<PlusOutlined />}
                                        >
                                            添加兴趣
                                        </Button>
                                    )}
                                </Space>
                            </div>
                        </Panel>

                        {/* 游戏技能面板 */}
                        <Panel
                            header="游戏技能"
                            key="gameSkills"
                            extra={<BilibiliOutlined />}
                            className={styles.collapsePanel}
                        >
                            <div className={styles.panelContent}>
                                <Space align="baseline" className={styles.inputGroup}>
                                    <Form.Item name={['gameSkill', 'name']}>
                                        <Input placeholder="游戏名称" />
                                    </Form.Item>
                                    <Form.Item name={['gameSkill', 'level']}>
                                        <Select placeholder="选择技能等级" style={{ width: 200 }}>
                                            {GAME_SKILL_LEVELS.map(level => (
                                                <Option key={level.value} value={level.value}>
                                                    {level.label} - {level.description}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item name={['gameSkill', 'rank']}>
                                        <Input placeholder="段位/等级" />
                                    </Form.Item>
                                    <Form.Item name={['gameSkill', 'position']}>
                                        <Input placeholder="偏好位置/角色" />
                                    </Form.Item>
                                    <Button type="dashed" onClick={handleGameSkillAdd} icon={<PlusOutlined />}>
                                        添加
                                    </Button>
                                </Space>

                                <div className={styles.tagContainer}>
                                    {gameSkills.map((skill, index) => (
                                        <Tag
                                            key={index}
                                            closable
                                            onClose={() => {
                                                const newSkills = gameSkills.filter((_, i) => i !== index);
                                                setGameSkills(newSkills);
                                            }}
                                            className={styles.tag}
                                        >
                                            {skill.gameName} -
                                            {GAME_SKILL_LEVELS.find(l => l.value === skill.skillLevel)?.label}
                                            {skill.preferredPosition && ` (${skill.preferredPosition})`}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Panel>

                        {/* 特长面板 */}
                        <Panel header="特长" key="talents" extra={<TrophyOutlined />}>
                            <div className={styles.panelContent}>
                                <Space align="baseline" className={styles.inputGroup}>
                                    <Form.Item
                                        name={['talent', 'name']}
                                        // 只有当没有特长时才要求填写
                                        rules={[
                                            {
                                                validator: async (_, value) => {
                                                    if (!value && talents.length === 0) {
                                                        throw new Error('请输入特长名称');
                                                    }
                                                }
                                            }
                                        ]}
                                    >
                                        <Input placeholder="特长名称" />
                                    </Form.Item>

                                    <Form.Item
                                        name={['talent', 'level']}
                                        // 同样修改验证规则
                                        rules={[
                                            {
                                                validator: async (_, value) => {
                                                    if (!value && talents.length === 0) {
                                                        throw new Error('请选择熟练度');
                                                    }
                                                }
                                            }
                                        ]}
                                    >
                                        <Select placeholder="选择熟练度" style={{ width: 200 }}>
                                            {TALENT_SKILL_LEVELS.map(level => (
                                                <Option key={level.value} value={level.value}>
                                                    {level.label} - {level.description}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item name={['talent', 'canTeach']} valuePropName="checked">
                                        <Checkbox>可以教授他人</Checkbox>
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        onClick={handleTalentAdd}
                                        icon={<PlusOutlined />}
                                    >
                                        添加特长
                                    </Button>
                                </Space>

                                {/* 展示已添加的特长列表 */}
                                <div className={styles.tagContainer}>
                                    {talents.map((talent, index) => (
                                        <Tag
                                            key={index}
                                            closable
                                            onClose={() => {
                                                setTalents(prev => prev.filter((_, i) => i !== index));
                                            }}
                                            className={styles.tag}
                                        >
                                            {`${talent.talentName} - ${
                                                TALENT_SKILL_LEVELS.find(
                                                    level => level.value === talent.proficiency
                                                )?.label
                                            }${talent.canTeach ? ' (可教授)' : ''}`}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Panel>

                        {/* 运动项目面板 */}
                        <Panel
                            header="运动项目"
                            key="sports"
                            extra={<FireFilled  />}
                            className={styles.collapsePanel}
                        >
                            <div className={styles.panelContent}>
                                <Space className={styles.inputGroup}>
                                    <Input
                                        placeholder="添加运动项目"
                                        value={sportInputValue}
                                        onChange={e => setSportInputValue(e.target.value)}
                                        onPressEnter={handleSportAdd}
                                    />
                                    <Button type="dashed" onClick={handleSportAdd} icon={<PlusOutlined />}>
                                        添加
                                    </Button>
                                </Space>

                                <div className={styles.tagContainer}>
                                    {sports.map((sport, index) => (
                                        <Tag
                                            key={index}
                                            closable
                                            onClose={() => {
                                                const newSports = sports.filter((_, i) => i !== index);
                                                setSports(newSports);
                                            }}
                                            className={styles.tag}
                                        >
                                            {sport}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Panel>

                        {/* 学习科目面板 */}
                        <Panel
                            header="学习科目"
                            key="studySubjects"
                            extra={<BookOutlined />}
                            className={styles.collapsePanel}
                        >
                            <div className={styles.panelContent}>
                                <Space className={styles.inputGroup}>
                                    <Input
                                        placeholder="添加学习科目（如：高等数学、计算机网络）"
                                        value={studySubjectInput}
                                        onChange={e => setStudySubjectInput(e.target.value)}
                                        onPressEnter={handleStudySubjectAdd}
                                        style={{ width: 300 }}
                                    />
                                    <Button
                                        type="dashed"
                                        onClick={handleStudySubjectAdd}
                                        icon={<PlusOutlined />}
                                    >
                                        添加
                                    </Button>
                                </Space>

                                <div className={styles.tagContainer}>
                                    {studySubjects.map((subject, index) => (
                                        <Tag
                                            key={index}
                                            closable
                                            onClose={() => {
                                                const newSubjects = studySubjects.filter((_, i) => i !== index);
                                                setStudySubjects(newSubjects);
                                                form.setFieldsValue({ studySubjects: newSubjects });
                                            }}
                                            className={styles.tag}
                                        >
                                            {subject}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Panel>

                        <Panel header="旅行目的地" key="destinations" extra={<CompassOutlined />}>
                            <div className={styles.panelContent}>
                                <Space align="baseline" className={styles.inputGroup} wrap>
                                    <Form.Item
                                        name={['destination', 'name']}
                                        rules={[
                                            {
                                                validator: async (_, value) => {
                                                    if (!value && travelDestinations.length === 0) {
                                                        throw new Error('请输入目的地名称');
                                                    }
                                                }
                                            }
                                        ]}
                                    >
                                        <Input placeholder="目的地名称" style={{ width: 150 }} />
                                    </Form.Item>

                                    <Form.Item
                                        name={['destination', 'province']}
                                        rules={[
                                            {
                                                validator: async (_, value) => {
                                                    if (!value && travelDestinations.length === 0) {
                                                        throw new Error('请输入所在省份');
                                                    }
                                                }
                                            }
                                        ]}
                                    >
                                        <Input placeholder="所在省份" style={{ width: 150 }} />
                                    </Form.Item>

                                    <Form.Item
                                        name={['destination', 'country']}
                                        initialValue="中国"
                                    >
                                        <Input placeholder="所在国家" style={{ width: 150 }} />
                                    </Form.Item>

                                    <Form.Item
                                        name={['destination', 'type']}
                                        rules={[
                                            {
                                                validator: async (_, value) => {
                                                    if (!value && travelDestinations.length === 0) {
                                                        throw new Error('请选择旅行类型');
                                                    }
                                                }
                                            }
                                        ]}
                                    >
                                        <Select placeholder="选择旅行类型" style={{ width: 200 }}>
                                            {TRAVEL_TYPES.map(type => (
                                                <Option key={type.value} value={type.value}>
                                                    {type.label} - {type.description}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item name={['destination', 'season']}>
                                        <Select placeholder="期望季节" style={{ width: 150 }}>
                                            {SEASONS.map(season => (
                                                <Option key={season.value} value={season.value}>
                                                    {season.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        onClick={handleDestinationAdd}
                                        icon={<PlusOutlined />}
                                    >
                                        添加目的地
                                    </Button>
                                </Space>

                                {/* 显示已添加的目的地列表 */}
                                <div className={styles.tagContainer}>
                                    {travelDestinations.map((dest, index) => (
                                        <Tag
                                            key={index}
                                            closable
                                            onClose={() => {
                                                setTravelDestinations(prev =>
                                                    prev.filter((_, i) => i !== index)
                                                );
                                            }}
                                            className={styles.tag}
                                        >
                                            {`${dest.destination}(${dest.province}, ${dest.country}) - 
                    ${TRAVEL_TYPES.find(t => t.value === dest.travelType)?.label}
                    ${dest.expectedSeason ?
                                                ` (${SEASONS.find(s => s.value === dest.expectedSeason)?.label})`
                                                : ''}`}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Panel>
                    </Collapse>

                    {/* 联系方式部分 */}
                    <div className={styles.contactSection}>
                        <Title level={4} className={styles.sectionTitle}>
                            <ContactsOutlined className={styles.sectionIcon} /> 联系方式
                        </Title>
                        <div className={styles.sectionContent}>
                            <Space align="baseline" className={styles.inputGroup}>
                                <Form.Item
                                    name="contactType"
                                    label="联系方式类型"
                                    rules={[{ required: true, message: '请选择联系方式类型' }]}
                                >
                                    <Select placeholder="选择联系方式类型" style={{ width: 200 }}>
                                        {CONTACT_TYPES.map(type => (
                                            <Option key={type.value} value={type.value}>
                                                {type.label}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="contactNumber"
                                    label="联系方式"
                                    rules={[{ required: true, message: '请输入联系方式' }]}
                                >
                                    <Input placeholder="请输入您的联系方式" style={{ width: 200 }} />
                                </Form.Item>
                            </Space>
                        </div>
                    </div>

                    {/* 提交按钮 */}
                    <Form.Item className={styles.submitButtonContainer}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className={styles.submitButton}
                            size="large"
                            icon={<PlusOutlined />}
                        >
                            {isEditMode ? '更新档案' : '创建档案'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </FriendLayout>
    );
};

export default CreateFriendProfile;