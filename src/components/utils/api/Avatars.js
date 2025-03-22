import axios from 'axios';

export const fetchAvatarsByUserIds = async (userIds) => {
    try {
        const response = await axios.post('http://127.0.0.1:8080/api/users/avatars', userIds, {
            withCredentials: true,
        });
        return response.data; // 返回 userId -> avatarUrl 的映射
    } catch (error) {
        console.error('Failed to fetch avatars:', error);
        return {}; // 如果失败返回空映射
    }
};
