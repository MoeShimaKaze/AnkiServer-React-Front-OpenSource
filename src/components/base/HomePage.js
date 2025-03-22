import React from 'react';
import { Typography, Button } from 'antd';
import styles from '../../assets/css/base/HomePage.module.css';
import Navbar from './Navbar';
import mailOrderIcon from '../../assets/icon/express.png';
import communicationIcon from '../../assets/icon/communication.png';

const { Title } = Typography;

function HomePage() {
  return (
      <div>
        <div className={styles.backgroundBlur}></div>
        <div className={styles.contentContainer}>
          <Navbar />
          <div className={styles.mainContent}>
            <Title level={1} className={styles.mainTitle}>安気校园</Title>
            <Title level={2} className={styles.subTitle}>助力校园生活更轻松</Title>
            <div className={styles.buttonContainer}>
              <Button
                  type="primary"
                  size="large"
                  className={styles.homeButton}
                  href="https://qm.qq.com/q/C67qwUYCJy"
                  target="_blank"
              >
                <img src={communicationIcon} alt="Contact" className={styles.buttonIcon} />
                联系我们
              </Button>
              <Button
                  type="primary"
                  size="large"
                  className={styles.homeButton}
                  href="/mailorder"
              >
                <img src={mailOrderIcon} alt="Mail Order" className={styles.buttonIcon} />
                代拿业务
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}

export default HomePage;