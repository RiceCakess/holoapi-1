const { Model } = require('sequelize');
const consts = require('../../consts');

class Channel extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        yt_channel_link: {
          type: DataTypes.STRING,
          unique: true,
        },
        yt_videos_link: {
          type: DataTypes.STRING,
          unique: true,
        },
        bb_space_link: {
          type: DataTypes.INTEGER,
          unique: true,
        },
        bb_room_link: {
          type: DataTypes.INTEGER,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
        },
        thumbnail: {
          type: DataTypes.STRING,
        },
        published_at: {
          type: DataTypes.DATE,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: consts.STATUSES.NEW,
        },
        twitter_link: {
          type: DataTypes.STRING,
        },
        facebook_link: {
          type: DataTypes.STRING,
        },
        twitch_link: {
          type: DataTypes.STRING,
        },
        instagram_link: {
          type: DataTypes.STRING,
        },
        crawled_at: {
          type: DataTypes.DATE,
        },
        created_at: {
          type: DataTypes.DATE,
        },
        updated_at: {
          type: DataTypes.DATE,
        },
      },
      {
        tableName: consts.TABLE_CHANNEL,
        sequelize,
      },
    );
  }

  static associate(models) {
    this.videos = this.hasMany(models.Video, { as: 'videos', foreignKey: 'channel_id' });
    this.stats = this.hasOne(models.ChannelStats, { as: 'stats', foreignKey: 'channel_id' });
  }
}

module.exports = Channel;