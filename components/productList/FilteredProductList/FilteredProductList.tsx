import { queryTypes, useQueryState } from "next-usequerystate";
import { useEffect, useState } from "react";

import { ProductCollection } from "@/components/ProductCollection";
import {
  AttributeFilterFragment,
  OrderDirection,
  ProductFilterInput,
  ProductOrderField,
} from "@/saleor/api";

import {
  getPillsData,
  parseQueryAttributeFilters,
  parseQuerySort,
  serializeQueryAttributeFilters,
  serializeQuerySort,
} from "./attributes";
import FilterDropdown from "./FilterDropdown";
import { FilterPill, FilterPills } from "./FilterPills";
import SortingDropdown from "./SortingDropdown";
import StockToggle from "./StockToggle";

export interface FilteredProductListProps {
  attributeFiltersData: AttributeFilterFragment[];
  collectionIDs?: string[];
  categoryIDs?: string[];
}

export interface Filters {
  sortBy: string;
  attributes: Record<string, Array<string>>;
}

export interface ListFilters {
  attributes: {};
}

export function FilteredProductList({
  attributeFiltersData,
  collectionIDs,
  categoryIDs,
}: FilteredProductListProps) {
  const [queryFilters, setQueryFilters] = useQueryState("filters", {
    parse: parseQueryAttributeFilters,
    serialize: serializeQueryAttributeFilters,
    defaultValue: [],
  });

  const [itemsCounter, setItemsCounter] = useState(0);

  const [sortBy, setSortBy] = useQueryState("sortBy", {
    parse: parseQuerySort,
    serialize: serializeQuerySort,
    defaultValue: null,
  });

  const [inStockFilter, setInStockFilter] = useQueryState(
    "inStock",
    queryTypes.boolean.withDefault(false)
  );

  const [productsFilter, setProductsFilter] = useState<ProductFilterInput>();

  const pills: FilterPill[] = getPillsData(queryFilters, attributeFiltersData);

  useEffect(() => {
    setProductsFilter({
      attributes: queryFilters.filter((f) => f.values?.length),
      ...(categoryIDs?.length && { categories: categoryIDs }),
      ...(collectionIDs?.length && { collections: collectionIDs }),
      ...(inStockFilter && { stockAvailability: "IN_STOCK" }),
    });
  }, [inStockFilter, JSON.stringify(queryFilters), categoryIDs, collectionIDs]);

  const removeAttributeFilter = (attributeSlug: string, choiceSlug: string) => {
    const newFilters = [];
    for (const fa of queryFilters) {
      if (fa.slug !== attributeSlug) {
        newFilters.push(fa);
        continue;
      }
      fa.values = fa.values.filter((v) => v !== choiceSlug);
      if (fa.values.length > 0) {
        newFilters.push(fa);
      }
    }
    setQueryFilters(newFilters.length ? newFilters : null, {
      scroll: false,
      shallow: true,
    });
  };

  const addAttributeFilter = (attributeSlug: string, choiceSlug: string) => {
    if (
      pills.find((pill) => pill.attributeSlug === attributeSlug && pill.choiceSlug === choiceSlug)
    ) {
      removeAttributeFilter(attributeSlug, choiceSlug);
      return;
    }
    const newFilters = [];
    let modified = false;
    for (const fa of queryFilters) {
      if (fa.slug !== attributeSlug) {
        newFilters.push(fa);
        continue;
      }
      if (!fa.values.includes(choiceSlug)) {
        fa.values.push(choiceSlug);
        newFilters.push(fa);
        modified = true;
      } else {
        newFilters.push(fa);
        modified = true;
      }
    }
    if (!modified) {
      newFilters.push({ slug: attributeSlug, values: [choiceSlug] });
    }

    setQueryFilters(newFilters, {
      scroll: false,
      shallow: true, // Don't run getStaticProps / getServerSideProps / getInitialProps
    });
  };

  const clearFilters = async () => {
    // await required when multiple query changes are applied at once
    await setQueryFilters(null, {
      scroll: false,
      shallow: true,
    });
    await setInStockFilter(null, {
      scroll: false,
      shallow: true,
    });
  };

  if (!productsFilter) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col divide-y">
        <div className="flex items-center">
          <div className="flex-grow">
            {attributeFiltersData.map((attribute) => (
              <FilterDropdown
                key={attribute.id}
                label={attribute.name!}
                optionToggle={addAttributeFilter}
                attributeSlug={attribute.slug!}
                options={attribute.choices?.edges.map((choiceEdge) => {
                  const choice = choiceEdge.node;
                  return {
                    chosen: !!pills.find(
                      (pill) =>
                        pill.attributeSlug === attribute.slug && pill.choiceSlug === choice.slug
                    ),
                    id: choice.id,
                    label: choice.name || choice.id,
                    slug: choice.slug || choice.id,
                  };
                })}
              />
            ))}
            <SortingDropdown
              optionToggle={(field?: ProductOrderField, direction?: OrderDirection) => {
                setSortBy(field && direction ? { field, direction } : null, {
                  scroll: false,
                  shallow: true,
                });
              }}
              chosen={sortBy}
            />
            <StockToggle
              enabled={inStockFilter}
              onChange={(value: boolean) =>
                setInStockFilter(value ? true : null, {
                  scroll: false,
                  shallow: true,
                })
              }
            />
          </div>
          <div className="flex-none">
            <div>{itemsCounter} items</div>
          </div>
        </div>
        {pills.length > 0 && (
          <FilterPills
            pills={pills}
            onClearFilters={clearFilters}
            onRemoveAttribute={removeAttributeFilter}
          />
        )}
      </div>

      <div className="mt-4">
        <ProductCollection
          filter={productsFilter}
          sortBy={sortBy || undefined}
          setCounter={setItemsCounter}
        />
      </div>
    </>
  );
}

export default FilteredProductList;
