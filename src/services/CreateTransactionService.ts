import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string
  type: "income" | "outcome"
  value: number
  category: string
}

class CreateTransactionService {
  public async execute({ title, type, value, category }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository)
    const categoryRepository = getRepository(Category)

    const { total } = await transactionRepository.getBalance();

    if (type === "outcome" && total < value)
      throw new AppError("It's not possible create outcome transaction without a valid balance");

    let categoryFind = await categoryRepository.findOne({
      where: {
        title: category
      }
    })

    if (!categoryFind) {
      categoryFind = await categoryRepository.create({
        title: category
      })
      await categoryRepository.save(categoryFind)
    }


    const transaction = await transactionRepository.create({
      title,
      type,
      value,
      category: categoryFind
    })

    await transactionRepository.save(transaction)

    return transaction
  }
}

export default CreateTransactionService;
