import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Button,
  Input,
  TextLink,
  Modal,
  RadioButton,
  Heading3,
} from "@stellar/design-system";
import { DetailsTooltip } from "components/DetailsTooltip";
import { CSS_MODAL_PARENT_ID } from "constants/settings";
import { fetchAccountAction } from "ducks/account";
import { resetActiveAssetAction } from "ducks/activeAsset";
import {
  resetSep31SendAction,
  submitSep31SendTransactionAction,
  setCustomerTypesAction,
  fetchSendFieldsAction,
} from "ducks/sep31Send";
import { capitalizeString } from "helpers/capitalizeString";
import { useRedux } from "hooks/useRedux";
import { ActionStatus } from "types/types.d";

enum CustomerType {
  SENDER = "sender",
  RECEIVER = "receiver",
}

export const Sep31Send = () => {
  const { account, sep31Send } = useRedux("account", "sep31Send");
  const [formData, setFormData] = useState<any>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [customerTypes, setCustomerTypes] = useState<{
    sender: string;
    receiver: string;
  }>({
    sender: "",
    receiver: "",
  });

  const { data } = sep31Send;
  const dispatch = useDispatch();

  useEffect(() => {
    if (sep31Send.status === ActionStatus.CAN_PROCEED) {
      if (sep31Send.data.isTypeSelected) {
        dispatch(fetchSendFieldsAction());
      }
    }

    if (sep31Send.status === ActionStatus.SUCCESS) {
      if (account.data?.id) {
        resetLocalState();
        dispatch(
          fetchAccountAction({
            publicKey: account.data.id,
            secretKey: account.secretKey,
          }),
        );
        dispatch(resetSep31SendAction());
      }
    }
  }, [
    sep31Send.status,
    sep31Send.data.isTypeSelected,
    account.data?.id,
    account.secretKey,
    dispatch,
  ]);

  const resetLocalState = () => {
    setErrorMessage("");
    setCustomerTypesAction({ senderType: "", receiverType: "" });
    setFormData({});
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    const [section, field] = id.split("#");

    const updatedState = {
      ...formData,
      [section]: {
        ...(formData[section] || {}),
        [field]: value,
      },
    };

    setFormData(updatedState);
  };

  const handleTypeChange = (type: CustomerType, typeId: string) => {
    const updatedTypes = {
      ...customerTypes,
      [type]: typeId,
    };

    setCustomerTypes(updatedTypes);
  };

  const handleSubmit = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();
    dispatch(submitSep31SendTransactionAction({ ...formData }));
  };

  const handleSelectTypes = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    setErrorMessage("");
    const { sender, receiver } = customerTypes;
    event.preventDefault();

    if (
      (data.multipleSenderTypes?.length && !sender) ||
      (data.multipleReceiverTypes?.length && !receiver)
    ) {
      setErrorMessage("Please select sender/receiver type");
      return;
    }

    dispatch(
      setCustomerTypesAction({
        senderType: sender ?? data.senderType,
        receiverType: receiver ?? data.receiverType,
      }),
    );
  };

  const handleClose = () => {
    resetLocalState();
    dispatch(resetSep31SendAction());
    dispatch(resetActiveAssetAction());
  };

  const renderSenderOptions = () => {
    // Sender type pre-selected
    if (data.senderType) {
      return (
        <p>
          <code>{data.senderType}</code> was automatically selected
        </p>
      );
    }

    // No sender type required
    if (!data.senderType && !data.multipleSenderTypes?.length) {
      return <p>Sender type is not required</p>;
    }

    // Multiple sender types
    return data.multipleSenderTypes?.map((sender) => (
      <RadioButton
        onChange={() => handleTypeChange(CustomerType.SENDER, sender.type)}
        key={sender.type}
        id={sender.type}
        value={sender.type}
        name="customer-sender"
        label={
          <span className="inline-block">
            <code>{sender.type}</code> {sender.description}
          </span>
        }
      />
    ));
  };

  const renderReceiverOptions = () => {
    // Receiver type pre-selected
    if (data.receiverType) {
      return (
        <p>
          <code>{data.receiverType}</code> was automatically selected
        </p>
      );
    }

    // No receiver type required
    if (!data.receiverType && !data.multipleReceiverTypes?.length) {
      return <p>Receiver type is not required</p>;
    }

    // Multiple receiver types
    return data.multipleReceiverTypes?.map((receiver) => (
      <RadioButton
        onChange={() => handleTypeChange(CustomerType.RECEIVER, receiver.type)}
        key={receiver.type}
        id={receiver.type}
        value={receiver.type}
        name="customer-receiver"
        label={
          <span className="inline-block">
            <code>{receiver.type}</code> {receiver.description}
          </span>
        }
      />
    ));
  };

  if (sep31Send.status === ActionStatus.NEEDS_INPUT) {
    // Select customer types
    if (!data.isTypeSelected) {
      return (
        <Modal visible onClose={handleClose} parentId={CSS_MODAL_PARENT_ID}>
          <Modal.Heading>Customer Types</Modal.Heading>

          <Modal.Body>
            <p>
              Receiving anchors are required to collect Know Your Customer (KYC)
              information on the customers involved in a transaction. Each type
              described below corresponds to a different set of KYC values the
              anchor will request the sending anchor to provide. This demo
              wallet, which acts as a sending anchor, will provide you a form to
              enter the fields corresponding to the type selected.
            </p>

            <div>
              <Heading3>Sender</Heading3>
              {renderSenderOptions()}
            </div>

            <div>
              <Heading3>Receiver</Heading3>
              {renderReceiverOptions()}
            </div>

            {errorMessage && <p className="error">{errorMessage}</p>}
          </Modal.Body>

          <Modal.Footer>
            <Button onClick={handleSelectTypes}>Submit</Button>
          </Modal.Footer>
        </Modal>
      );
    }

    // Data fields
    if (data.isTypeSelected) {
      const { transaction, sender, receiver } = data.fields;

      const allFields = {
        amount: {
          amount: {
            description: "amount to send",
          },
        },
        ...(sender ? { sender } : {}),
        ...(receiver ? { receiver } : {}),
        ...(transaction ? { transaction } : {}),
      };

      return (
        <Modal visible onClose={handleClose} parentId={CSS_MODAL_PARENT_ID}>
          <Modal.Heading>
            <DetailsTooltip
              details={
                <>
                  These are the fields the receiving anchor requires. The
                  sending client obtains them from the /customer endpoint.{" "}
                  <TextLink href="https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md#customer-get">
                    Learn more
                  </TextLink>
                </>
              }
              isInline
            >
              <>Sender and receiver info</>
            </DetailsTooltip>
          </Modal.Heading>

          <Modal.Body>
            {Object.entries(allFields).map(([sectionTitle, sectionItems]) => (
              <div className="vertical-spacing" key={sectionTitle}>
                <Heading3>{capitalizeString(sectionTitle)}</Heading3>
                {Object.entries(sectionItems || {}).map(([id, input]) => (
                  // TODO: if input.choices, render Select
                  <Input
                    key={`${sectionTitle}#${id}`}
                    id={`${sectionTitle}#${id}`}
                    label={input.description}
                    required={!input.optional}
                    onChange={handleChange}
                  />
                ))}
              </div>
            ))}
          </Modal.Body>

          <Modal.Footer>
            <Button onClick={handleSubmit}>Submit</Button>
          </Modal.Footer>
        </Modal>
      );
    }
  }

  return null;
};
