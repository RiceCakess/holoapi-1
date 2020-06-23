const sequelize = require('sequelize');
const { Router } = require('express');
const { fixchar } = require('fixchar');
const { RESPONSE_FIELDS, CACHE_TTL } = require('../../../../consts');
const { db, GenericError } = require('../../../../modules');
const { asyncMiddleware } = require('../../middleware/error');
const { limitChecker } = require('../../middleware/filters');
const { channel, comments } = require('../../../../database/models/video');
const cacheService = require('../../services/CacheService');

const { Op } = sequelize;

const router = new Router();

const getTotalCount = async (q, channel_id) => {
  const cacheKey = `count:${q}_${channel_id}`;
  const cache = await cacheService.getFromCache(cacheKey);
  if (cache.cached) {
    return cache;
  }

  // object structure: { count: 132 }
  const count = await db.VideoComment.findOne({
    attributes: [sequelize.fn('count', sequelize.fn('distinct', sequelize.col('video_id')))],
    where: { message: { [Op.iLike]: `%${q}%` } },
    subQuery: false,
    raw: true,
    ...channel_id && {
      include: [
        {
          association: 'video',
          attributes: [],
          where: { channel_id },
        },
      ],
    },
  });

  cacheService.saveToCache(cacheKey, count, CACHE_TTL.COMMENTS);
  return count;
};

const getVideoIds = async (q, channel_id) => {
  const cacheKey = `vids:${q}_${channel_id}`;
  const cache = await cacheService.getFromCache(cacheKey);
  if (cache.cached) {
    return cache.data;
  }

  // object structure: { count: 132 }
  const count = await db.VideoComment.findAll({
    attributes: ['video.id'],
    include: [
      {
        association: 'video',
        attributes: [],
        ...channel_id && {
          where: { channel_id },
        },
      },
    ],
    where: { message: { [Op.iLike]: `%${q}%` } },
    group: 'video.id',
    order: [[db.VideoComment.associations.video, 'published_at', 'DESC']],
    // Fixes weird subquery that kills performance
    subQuery: false,
    raw: true,
  })
    .map(({ id }) => id);

  cacheService.saveToCache(cacheKey, { data: count }, CACHE_TTL.COMMENTS);
  return count;
};


router.get('/search', limitChecker, asyncMiddleware(async (req, res) => {
  const { limit = 25, offset = 0, channel_id, q } = req.query;

  if (!q || q.length < 1) {
    throw new GenericError('Expected ?q param');
  }

  // Sanitizing query to remove full width alphanumeric and half-width kana
  const sanitizedQuery = fixchar(q).trim();

  const totalCount = getTotalCount(sanitizedQuery, channel_id);

  const videoIds = await getVideoIds(q, channel_id);

  const videoIdsInPage = videoIds.slice(offset, offset + limit);

  const videos = await db.Video.findAll({
    attributes: RESPONSE_FIELDS.VIDEO,
    where: {
      id: videoIdsInPage,
    },
    include: [{
      association: comments,
      attributes: RESPONSE_FIELDS.VIDEO_COMMENT_SIMPLE,
      required: true,
    }, {
      association: channel,
      attributes: RESPONSE_FIELDS.CHANNEL,
      required: true,
    }],
  });

  const { count } = await totalCount;

  const results = {
    // count: rows.length,
    total: count,
    query: sanitizedQuery,
    comments: videos,
  };

  res.json(results);
}));

module.exports = router;
