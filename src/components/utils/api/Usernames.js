import axios from 'axios';

export const fetchUsernamesByUserIds = async (userIds) => {
    try {
        const response = await axios.post('http://localhost:8080/api/users/usernames', userIds, {
            withCredentials: true,
        });
        return response.data; // 返回 userId -> username 的映射
    } catch (error) {
        console.error('Failed to fetch usernames:', error);
        return {}; // 如果失败返回空映射
    }
};