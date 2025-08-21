import React from 'react';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  size = 'small', 
  color = 'red' 
}) => {
  console.log('🔍 NotificationBadge: Received count:', count);
  
  if (!count || count === 0) {
    console.log('🔍 NotificationBadge: No count or count is 0, not showing badge');
    return null;
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '10px',
          minWidth: '16px',
          height: '16px',
        };
      case 'medium':
        return {
          fontSize: '12px',
          minWidth: '20px',
          height: '20px',
        };
      case 'large':
        return {
          fontSize: '14px',
          minWidth: '24px',
          height: '24px',
        };
      default:
        return {
          fontSize: '10px',
          minWidth: '16px',
          height: '16px',
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const badgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: color,
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: sizeStyles.fontSize,
    fontWeight: 'bold',
    minWidth: sizeStyles.minWidth,
    height: sizeStyles.height,
    padding: '2px',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    animation: 'pulse 2s infinite',
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            50% {
              transform: scale(1.1);
              box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
          }
        `}
      </style>
      <div style={badgeStyles}>
        {count > 99 ? '99+' : count}
      </div>
    </>
  );
};

export default NotificationBadge;
