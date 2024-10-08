import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import mongoose, { Model, Types } from "mongoose";
import { IPaginate } from "../dto/common.dto";


export class Service<TDoc> {
    private DEFAULT_LIMIT = 10;
    private DEFAULT_PAGE = 1; 
    constructor(private readonly model: Model<TDoc>) { }

    // create new
    protected async createOne(createDataDto: object) {
        const newData = new this.model(createDataDto);
        return await newData.save();
    }
    // create many
    protected async createMany(createDataDto: TDoc[]) {
        return await this.model.insertMany(createDataDto);
    }

    // find all documents by query
    protected async findAllByQuery(query: object) {
        return await this.model.find({ ...query, deletedAt: null });
    }

    // find one document
    protected async findOneById(id: Types.ObjectId) {
        return await this.model.findOne({ _id: id, deletedAt: null });
    }

    // find one document
    protected async findOneByQuery(query: object) {
        return await this.model.findOne({ ...query, deletedAt: null });
    }
    // update one document
    protected async updateById(id: Types.ObjectId, updateDataDto: object) {
        const data = await this.model.findByIdAndUpdate(id, updateDataDto, { new: true });
        if (!data) {
            throw new HttpException('Failed to update', HttpStatus.BAD_REQUEST);
        }
        return data;
    }

    // update one document by query
    protected async updateByQuery(query: object, updateDataDto: object) {
        const data = await this.model.findOneAndUpdate(query, updateDataDto, { new: true });
        return data;
    }

    // delete one by id
    protected async removeById(id: Types.ObjectId) {
        return await this.model.deleteOne({ _id: id,},);
    }

    // delete by query
    protected async removeByQuery(query: object) {
        return await this.model.deleteMany({ ...query, deletedAt: null }, { deletedAt: new Date() });
    }

     // find by paginate
  protected async findByPaginate(
    query: object = {},
    paginate?: IPaginate,
    lookupStages: any[] = [],
  ) {
    const page = Math.abs(Number(paginate?.page || 0) || this.DEFAULT_PAGE);
    const limit = Math.abs(Number(paginate?.limit || 0) || this.DEFAULT_LIMIT);

    if (query['_id']) {
      query['_id'] = new mongoose.Types.ObjectId(query['_id']);
    }
    const data = await this.model.aggregate([
      {
        $match: { ...query, deleted_at: null },
      },
      {
        $facet: {
          page: [
            {
              $count: 'totalIndex',
            },
            {
              $addFields: {
                totalPage: { $ceil: { $divide: ['$totalIndex', limit] } },
                currentPage: page,
                nextPage: {
                  $cond: {
                    if: { $gt: ['$totalPage', page] },
                    then: page + 1,
                    else: null,
                  },
                },
                previousPage: {
                  $cond: { if: { $gt: [page, 1] }, then: page - 1, else: null },
                },
                startingIndex: limit * (page - 1) + 1,
                endingIndex: limit * page,
                itemsOnCurrentPage: {
                  $cond: {
                    if: { $gte: [limit, '$totalIndex'] },
                    then: '$totalIndex',
                    else: limit,
                  },
                },
                limit: limit,
                sortBy: 'created_at',
                sortOrder: -1,
              },
            },
          ],
          data: [
            {
              $sort: {
                created_at: -1,
              },
            },
            {
              $skip: limit * (page - 1),
            },
            {
              $limit: limit,
            },
            ...lookupStages,
          ],
        },
      },
    ]);

    return {
      page: data?.[0]?.page?.[0],
      data: data?.[0]?.data,
    };
  
  
  }
  protected async findByPaginateNear(
    query: object = {},
    location:any={},
    paginate?: IPaginate,
    lookupStages: any[] = [],
  ) {
    const page = Math.abs(Number(paginate?.page || 0) || this.DEFAULT_PAGE);
    const limit = Math.abs(Number(paginate?.limit || 0) || this.DEFAULT_LIMIT);

    // if (query['_id']) {
    //   query['_id'] = new mongoose.Types.ObjectId(query['_id']);
    // }
console.log("location" ,query);
    const data = await this.model.aggregate([
      location,
      {
        $match: { ...query, deleted_at: null },
      },
      {
        $facet: {
          page: [
            {
              $count: 'totalIndex',
            },
            {
              $addFields: {
                totalPage: { $ceil: { $divide: ['$totalIndex', limit] } },
                currentPage: page,
                nextPage: {
                  $cond: {
                    if: { $gt: ['$totalPage', page] },
                    then: page + 1,
                    else: null,
                  },
                },
                previousPage: {
                  $cond: { if: { $gt: [page, 1] }, then: page - 1, else: null },
                },
                startingIndex: limit * (page - 1) + 1,
                endingIndex: limit * page,
                itemsOnCurrentPage: {
                  $cond: {
                    if: { $gte: [limit, '$totalIndex'] },
                    then: '$totalIndex',
                    else: limit,
                  },
                },
                limit: limit,
                sortBy: 'created_at',
                sortOrder: -1,
              },
            },
          ],
          data: [
            {
              $sort: {
                created_at: -1,
              },
            },
            {
              $skip: limit * (page - 1),
            },
            {
              $limit: limit,
            },
            ...lookupStages,
          ],
        },
      },
    ]);

    return {
      page: data?.[0]?.page?.[0],
      data: data?.[0]?.data,
    };
  
  
  }

   // find by query filter and populate
  // find by query filter and populate
  async findByQueryFilterAndPopulate({
    query,
    paginate,
    sort,
    lookupStages = [],
  }: {
    query: object;
    paginate?: IPaginate;
    sort?: { sortBy: string; sortOrder: number };
    lookupStages?: any[];
  }) {
    const page = Math.abs(Number(paginate?.page || 0) || this.DEFAULT_PAGE);
    const limit = Math.abs(Number(paginate?.limit || 0) || this.DEFAULT_LIMIT);

    if (query['is_active'] == 'true' || query['is_active'] == 1) {
      query['is_active'] = true;
    } else if (query['is_active'] == 'false' || query['is_active'] == 0) {
      query['is_active'] = false;
    }

    // sort
    const sortModified = {};
    if (sort && sort.sortBy && sort.sortOrder) {
      if (!(sort.sortOrder == 1 || sort.sortOrder == -1)) {
        throw new BadRequestException('sortOrder must 1 or -1');
      }
      sortModified[sort.sortBy] = Number(sort.sortOrder);
    } else {
      sortModified['created_at'] = -1;
    }

    const data = await this.model.aggregate([
      {
        $match: { ...query, deleted_at: null },
      },
      {
        $facet: {
          page: [
            {
              $count: 'totalIndex',
            },
            {
              $addFields: {
                totalPage: { $ceil: { $divide: ['$totalIndex', limit] } },
                currentPage: page,
                nextPage: {
                  $cond: {
                    if: { $gt: ['$totalPage', page] },
                    then: page + 1,
                    else: null,
                  },
                },
                previousPage: {
                  $cond: { if: { $gt: [page, 1] }, then: page - 1, else: null },
                },
                startingIndex: limit * (page - 1) + 1,
                endingIndex: limit * page,
                itemsOnCurrentPage: {
                  $cond: {
                    if: { $gte: [limit, '$totalIndex'] },
                    then: '$totalIndex',
                    else: limit,
                  },
                },
                limit: limit,
                sortBy: Object.keys(sortModified)[0],
                sortOrder: sortModified[Object.keys(sortModified)[0]],
              },
            },
          ],
          data: [
            {
              $sort: { ...sortModified },
            },
            {
              $skip: limit * (page - 1),
            },
            {
              $limit: limit,
            },
            ...lookupStages,
          ],
        },
      },
    ]);

    return {
      page: data?.[0]?.page?.[0],
      data: data?.[0]?.data,
    };
  }
// find all documents by query
protected async findAllByQueryPagination(query: object, paginate: IPaginate) {
  const page = Math.abs(Number(paginate?.page || 0) || this.DEFAULT_PAGE);
  const limit = Math.abs(Number(paginate?.limit || 0) || this.DEFAULT_LIMIT);

  let totalIndexPromise: Promise<any>;
  let totalDeletedIndexPromise: Promise<any>;


  if (Object.keys(query).length) {
    totalIndexPromise = this.model.countDocuments({ ...query, deleted_at: null });
  } else {
    totalIndexPromise = this.model.estimatedDocumentCount();
    totalDeletedIndexPromise = this.model.countDocuments({ deleted_at: { $ne: null } });
  }

  const dataPromise = this.model.find({ ...query, deleted_at: null })
    .sort({ created_at: -1 })
    .skip(limit * (page - 1))
    .limit(limit)
    .exec();

  const promiseArray = [dataPromise, totalIndexPromise];
  if (totalDeletedIndexPromise) {
    promiseArray.push(totalDeletedIndexPromise);
  }

  const [data, totalNotDeletedIndex, totalDeletedIndex] = await Promise.all(promiseArray);

  const totalIndex = totalNotDeletedIndex - (totalDeletedIndex || 0);

  const totalPage = Math.ceil(totalIndex / limit);
  const paginationInfo = {
    totalIndex,
    totalPage,
    currentPage: page,
    nextPage: totalPage > page ? page + 1 : null,
    previousPage: page > 1 ? page - 1 : null,
    startingIndex: limit * (page - 1) + 1,
    endingIndex: limit * page,
    itemsOnCurrentPage: Math.min(limit, totalIndex - limit * (page - 1)),
    limit,
    sortBy: 'created_at',
    sortOrder: -1
  };

  return {
    page: paginationInfo,
    data,
  }
}

}