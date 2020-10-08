import { getRepository, In, getCustomRepository } from 'typeorm';
import fs from 'fs';
import csvParse from "csv-parse";
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string
  type: "income" | "outcome"
  value: number
  category: string
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const fileReadStream = fs.createReadStream(path);

    const parsers = csvParse({ from: 2 })
    const parseCSV = fileReadStream.pipe(parsers)

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim()
      );

      if (!title || !type || !value) return;

      categories.push(category)
      transactions.push({ title, type, value, category })
    })

    await new Promise(resolve => parseCSV.on('end', resolve))

    const categoriesRepository = getRepository(Category)
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories)
      }
    })
    const existentCategoriesTitles = existentCategories.map(x => x.title)
    const categoriesToAdd = categories
      .filter(x => !existentCategoriesTitles.includes(x))
      .filter((value, index, self) => self.indexOf(value) === index)

    const newCategories = categoriesToAdd.map(title => ({ title }))
    await categoriesRepository.save(newCategories);

    const allCategories = [...existentCategories, ...newCategories]

    const createdTransactions = await transactionsRepository.create(
      transactions.map(x => ({
        title: x.title,
        type: x.type,
        value: x.value,
        category: allCategories.find(y => y.title === x.title)
      })))



    await transactionsRepository.save(createdTransactions)
    await fs.promises.unlink(path)

    return createdTransactions
  }
}

export default ImportTransactionsService;
