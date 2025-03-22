// QuestionTypeFilter.jsx
import React from 'react';
import { QUESTION_TYPE_DISPLAY } from '../map/questionTypeMap';
import styles from '../../../assets/css/question/QuestionTypeFilter.module.css';

const QuestionTypeFilter = ({ selectedType, onTypeChange }) => {
    return (
        <div className={styles.typeFilters}>
            <h3 className={styles.filterTitle}>问题类型</h3>
            {/* 添加"全部"选项 */}
            <label className={styles.typeFilter}>
                <input
                    type="radio"
                    name="questionType"
                    value="ALL"
                    checked={selectedType === 'ALL'}
                    onChange={() => onTypeChange('ALL')}
                />
                <span>全部问题</span>
            </label>
            {/* 渲染所有问题类型 */}
            {Object.entries(QUESTION_TYPE_DISPLAY).map(([key, value]) => (
                <label key={key} className={styles.typeFilter}>
                    <input
                        type="radio"
                        name="questionType"
                        value={key}
                        checked={selectedType === key}
                        onChange={() => onTypeChange(key)}
                    />
                    <span>{value}</span>
                </label>
            ))}
        </div>
    );
};

export default QuestionTypeFilter;